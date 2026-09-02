import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "node:crypto";
import { SUGGESTION_TEMPLATE } from "@/lib/suggestionTemplate";
import { PLATFORM, cleanSlug, slugProblem, utcOffsetOn } from "@/lib/platform";
import { forget } from "@/lib/memo";
import { sendPlatformEmail } from "@/lib/messaging";

export const dynamic = "force-dynamic";

/** Shuls a family can pick from on the national signup. */
export async function GET() {
  const shuls = await prisma.shul.findMany({
    where: { active: true, approved: true, listed: true },
    orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, city: true, state: true, hasSite: true },
  });
  return NextResponse.json({ shuls });
}

/**
 * A family names a shul that isn't listed yet. Creates it as a national
 * shul (no site of its own, no admin yet) so they can keep signing up.
 * Lightweight on purpose: the operator can rename/merge at /platform.
 */
export async function POST(req: NextRequest) {
  let body: { name?: unknown; city?: unknown; state?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ").slice(0, 100) : "";
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) : "";
  const state = typeof body.state === "string" ? body.state.trim().toUpperCase().slice(0, 2) : "";
  if (name.length < 3) return NextResponse.json({ error: "What's your shul called?" }, { status: 400 });
  if (!city) return NextResponse.json({ error: "Which city?" }, { status: 400 });

  // Same name in the same city = same shul.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const existing = (
    await prisma.shul.findMany({
      where: { active: true },
      select: { id: true, slug: true, name: true, city: true, state: true, hasSite: true, approved: true },
    })
  ).find((s) => norm(s.name) === norm(name) && norm(s.city) === norm(city));
  if (existing) return NextResponse.json({ shul: existing, existed: true });

  let slug = cleanSlug(`${name} ${city}`).slice(0, 40).replace(/-+$/, "");
  if (slugProblem(slug)) slug = cleanSlug(`shul-${name}`);
  for (let n = 2; await prisma.shul.findUnique({ where: { slug } }); n++) slug = `${cleanSlug(name).slice(0, 34)}-${n}`;

  const dates = PLATFORM.season.dates;
  const shul = await prisma.shul.create({
    data: {
      slug,
      name,
      city,
      state: state || null,
      hasSite: false,
      approved: true,
      listed: true,
      campaignName: PLATFORM.name,
      seasonLabel: PLATFORM.season.label,
      shabbosDates: dates.join(","),
      timezone: PLATFORM.season.timezone,
      tzOffset: utcOffsetOn(PLATFORM.season.timezone, dates[0]),
      pledgeEnabled: false,
      pledgePerSignup: 0,
      raffleEnabled: false,
      adminHash: createHash("sha256").update(`elul:${slug}:${randomBytes(24).toString("hex")}`).digest("hex"),
      suggestions: { createMany: { data: SUGGESTION_TEMPLATE.map((t) => ({ ...t })) } },
    },
    select: { id: true, slug: true, name: true, city: true, state: true, hasSite: true, approved: true },
  });
  forget("directory");
  forget("national-stats");
  if (PLATFORM.notifyEmail) {
    await sendPlatformEmail(
      [PLATFORM.notifyEmail],
      `New shul from national signup: ${name} (${city}${state ? `, ${state}` : ""})`,
      `A family added ${name} while signing up. It's live at /s/${slug}. Rename or merge it at /platform if it duplicates another.`
    );
  }
  return NextResponse.json({ shul, existed: false });
}
