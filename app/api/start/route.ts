import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { shulAdminHash } from "@/lib/adminAuth";
import { normalizeEmail } from "@/lib/contact";
import { SUGGESTION_TEMPLATE } from "@/lib/suggestionTemplate";
import { sendPlatformEmail } from "@/lib/messaging";
import { forget } from "@/lib/memo";
import { shulBaseUrl, rootBaseUrl } from "@/lib/tenant";
import {
  PLATFORM,
  TIMEZONES,
  cleanSlug,
  slugProblem,
  isIsoDate,
  utcOffsetOn,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

/** Very light abuse guard: a few signups per IP per hour (best effort on
 * serverless — the honeypot field and reserved slugs do the rest). */
const recent = new Map<string, number[]>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 5;
}

type Body = {
  name?: unknown; city?: unknown; state?: unknown; slug?: unknown;
  contactName?: unknown; contactEmail?: unknown; password?: unknown;
  campaignName?: unknown; seasonLabel?: unknown; dates?: unknown; timezone?: unknown;
  partnerName?: unknown;
  pledgeEnabled?: unknown; pledgePerSignup?: unknown; charityName?: unknown;
  raffleEnabled?: unknown; rafflePrize?: unknown;
  website?: unknown; // honeypot
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (str(body.website, 10)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooMany(ip)) {
    return NextResponse.json({ error: "Too many signups from this connection — try again in an hour." }, { status: 429 });
  }

  const name = str(body.name, 100);
  const city = str(body.city, 80);
  const state = str(body.state, 40) || null;
  const slug = cleanSlug(str(body.slug, 60) || name);
  const contactName = str(body.contactName, 80);
  const contactEmail = normalizeEmail(str(body.contactEmail, 120));
  const password = typeof body.password === "string" ? body.password : "";
  const campaignName = str(body.campaignName, 80) || PLATFORM.name;
  const seasonLabel = str(body.seasonLabel, 40) || PLATFORM.origin.season;
  const timezone = str(body.timezone, 60);
  const partnerName = str(body.partnerName, 100) || null;
  const pledgeEnabled = body.pledgeEnabled !== false;
  const pledgePerSignup = Math.max(0, Math.min(1000, Math.round(Number(body.pledgePerSignup)) || 0));
  const charityName = str(body.charityName, 100) || "Tomchei Shabbos";
  const raffleEnabled = body.raffleEnabled !== false;
  const rafflePrize = str(body.rafflePrize, 80) || "pizza party";
  const dates = Array.isArray(body.dates)
    ? [...new Set((body.dates as unknown[]).filter((d): d is string => typeof d === "string" && isIsoDate(d)))].sort()
    : [];

  if (!name) return NextResponse.json({ error: "What's your shul called?" }, { status: 400 });
  if (!city) return NextResponse.json({ error: "Which city is the shul in?" }, { status: 400 });
  const slugIssue = slugProblem(slug);
  if (slugIssue) return NextResponse.json({ error: `Web address: ${slugIssue}` }, { status: 400 });
  if (!contactName) return NextResponse.json({ error: "Tell us your name." }, { status: 400 });
  if (!contactEmail) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Admin password needs at least 8 characters." }, { status: 400 });
  if (!TIMEZONES.some((t) => t.value === timezone)) return NextResponse.json({ error: "Pick your timezone." }, { status: 400 });
  if (dates.length < 1 || dates.length > 12) return NextResponse.json({ error: "Pick between 1 and 12 Shabbos dates." }, { status: 400 });
  for (const d of dates) {
    if (new Date(`${d}T12:00:00Z`).getUTCDay() !== 6) {
      return NextResponse.json({ error: `${d} isn't a Saturday.` }, { status: 400 });
    }
  }
  if (pledgeEnabled && pledgePerSignup < 1) {
    return NextResponse.json({ error: "Set the pledge amount, or turn the pledge off." }, { status: 400 });
  }

  if (await prisma.shul.findUnique({ where: { slug }, select: { id: true } })) {
    return NextResponse.json({ error: "That web address was just taken — pick another." }, { status: 409 });
  }

  const shul = await prisma.shul.create({
    data: {
      slug,
      name,
      city,
      state,
      contactName,
      contactEmail,
      partnerName,
      campaignName,
      seasonLabel,
      shabbosDates: dates.join(","),
      tzOffset: utcOffsetOn(timezone, dates[0]),
      timezone,
      pledgeEnabled,
      pledgePerSignup: pledgeEnabled ? pledgePerSignup : 0,
      charityName,
      raffleEnabled,
      rafflePrize,
      adminHash: shulAdminHash(slug, password),
      suggestions: {
        createMany: { data: SUGGESTION_TEMPLATE.map((t) => ({ ...t })) },
      },
      resources: {
        create: {
          kicker: "For Children",
          title: "The Shabbos Helpers Guide",
          description:
            "Fifteen jobs with titles worth owning — from “The Challah Helper” to “The Havdalah Holder” — with a fridge checklist to go with them.",
          url: "/shabbos-helpers-guide.pdf",
          emoji: "🖍️",
          sortOrder: 1,
        },
      },
    },
  });

  forget("directory");
  forget("national-stats");
  const url = shulBaseUrl(shul);
  const adminUrl = `${url}/admin`;
  const welcome = [
    `Welcome to ${PLATFORM.name}, ${contactName}!`,
    ``,
    `${name} is live:`,
    url,
    ``,
    `Your admin page (password: the one you just chose):`,
    adminUrl,
    ``,
    `What to do next:`,
    `1. Open the admin page and look over the commitment list — hide anything that doesn't fit, add your own.`,
    `2. Ask the rav to announce it, then paste the site link into the shul WhatsApp. Families sign up in 30 seconds; no app, no passwords.`,
    `3. Reminders run themselves: Thursday before Shabbos, Sunday and Tuesday after. The admin page has the WhatsApp texts ready to paste each week.`,
    `4. Send us your logo (PNG) and we'll put it on your site: ${PLATFORM.contactEmail}`,
    ``,
    `Your campaign: ${seasonLabel}, ${dates.length} ${dates.length === 1 ? "Shabbos" : "Shabbosos"} (${dates.join(", ")}).`,
    ``,
    `Questions, ideas, or a shul that wants to join? Reply to this email.`,
    `— ${PLATFORM.name}`,
  ].join("\n");
  await sendPlatformEmail([contactEmail], `${name} is live on ${PLATFORM.name}`, welcome);

  if (PLATFORM.notifyEmail) {
    await sendPlatformEmail(
      [PLATFORM.notifyEmail],
      `New shul: ${name} (${city}${state ? `, ${state}` : ""})`,
      [
        `${contactName} <${contactEmail}> just set up ${name}.`,
        url,
        `Season: ${seasonLabel} · ${dates.join(", ")} · ${timezone}`,
        `Pledge: ${pledgeEnabled ? `$${pledgePerSignup} → ${charityName}` : "off"} · Raffle: ${raffleEnabled ? rafflePrize : "off"}`,
        `Manage: ${rootBaseUrl()}/platform`,
      ].join("\n")
    );
  }

  return NextResponse.json({ slug, url, adminUrl });
}
