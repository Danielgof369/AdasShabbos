import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCampaign, activeWeek, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import { normalizePhone, normalizeEmail } from "@/lib/contact";
import { isCategory, isChildCategory } from "@/lib/categories";
import { sendToHousehold } from "@/lib/messaging";

type MemberInput = {
  name?: unknown;
  category?: unknown;
  suggestionIds?: unknown;
  customTitle?: unknown;
};

export async function POST(req: NextRequest) {
  let body: {
    familyName?: unknown;
    phone?: unknown;
    email?: unknown;
    members?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const familyName =
    typeof body.familyName === "string" ? body.familyName.trim().slice(0, 60) : "";
  if (!familyName) {
    return NextResponse.json(
      { error: "Please provide your family (last) name." },
      { status: 400 }
    );
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (!email) {
    return NextResponse.json(
      { error: "Please provide a valid email — that's where your weekly reminders go." },
      { status: 400 }
    );
  }

  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) {
    return NextResponse.json(
      { error: "That phone number doesn't look right — please double-check it." },
      { status: 400 }
    );
  }

  const members = Array.isArray(body.members) ? (body.members as MemberInput[]) : [];
  if (members.length === 0 || members.length > 15) {
    return NextResponse.json({ error: "Please add at least one person." }, { status: 400 });
  }

  const campaign = await getCampaign();
  const week = activeWeek(campaign);

  const validSuggestionIds = new Set(
    (await prisma.suggestion.findMany({ where: { active: true }, select: { id: true } })).map(
      (s) => s.id
    )
  );

  const cleanMembers: {
    name: string;
    category: "man" | "woman" | "boy" | "girl";
    suggestionIds: string[];
    customTitle: string | null;
  }[] = [];
  for (const m of members) {
    const name = typeof m.name === "string" ? m.name.trim().slice(0, 60) : "";
    if (!name) {
      return NextResponse.json({ error: "Every person needs a first name." }, { status: 400 });
    }
    if (!isCategory(m.category)) {
      return NextResponse.json(
        { error: `Choose man, woman, boy, or girl for ${name}.` },
        { status: 400 }
      );
    }
    const suggestionIds = (Array.isArray(m.suggestionIds) ? m.suggestionIds : [])
      .filter((id): id is string => typeof id === "string" && validSuggestionIds.has(id))
      .slice(0, 6);
    const customTitle =
      typeof m.customTitle === "string" && m.customTitle.trim()
        ? m.customTitle.trim().slice(0, 120)
        : null;
    if (suggestionIds.length === 0 && !customTitle) {
      return NextResponse.json(
        { error: `Pick at least one commitment for ${name}.` },
        { status: 400 }
      );
    }
    cleanMembers.push({ name, category: m.category, suggestionIds, customTitle });
  }

  // Reuse an existing household for the same contact so families can add
  // people later without splitting their check-in link.
  const existing = await prisma.household.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  const household =
    existing ??
    (await prisma.household.create({
      data: {
        token: randomBytes(9).toString("base64url"),
        familyName,
        phone,
        email,
      },
    }));

  if (existing) {
    await prisma.household.update({
      where: { id: existing.id },
      data: {
        familyName: existing.familyName ?? familyName,
        phone: existing.phone ?? phone,
        email: existing.email ?? email,
      },
    });
  }

  // One commitment set, held for the whole campaign: a goal row per
  // commitment for the current week and every remaining week.
  for (const m of cleanMembers) {
    const member = await prisma.member.create({
      data: {
        householdId: household.id,
        name: m.name,
        gender: m.category,
        isChild: isChildCategory(m.category),
      },
    });
    for (let w = week; w <= campaign.weeks; w++) {
      for (const suggestionId of m.suggestionIds) {
        await prisma.goal.create({ data: { memberId: member.id, week: w, suggestionId } });
      }
      if (m.customTitle) {
        await prisma.goal.create({
          data: { memberId: member.id, week: w, customTitle: m.customTitle },
        });
      }
    }
  }

  // Welcome email with the family's permanent link (first signup only).
  const welcomed = await prisma.messageLog.findFirst({
    where: { householdId: household.id, kind: "welcome" },
  });
  if (!welcomed) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const link = `${base}/c/${household.token}`;
    const memberGoals = await prisma.member.findMany({
      where: { householdId: household.id },
      include: { goals: { where: { week }, include: { suggestion: true } } },
    });
    const lines = memberGoals
      .filter((m) => m.goals.length)
      .map(
        (m) =>
          `• ${m.name}: ${m.goals
            .map((g) => g.suggestion?.title ?? g.customTitle)
            .filter(Boolean)
            .join(" + ")}`
      );
    const text = [
      `Welcome to the Elul Shabbos Project! 🕯️`,
      ``,
      `The ${familyName} family has taken on their commitments for the four Shabbosos of the campaign — starting Shabbos ${formatShabbosDate(shabbosOfWeek(campaign, week))}, through Shabbos Shuva:`,
      ...lines,
      ``,
      `Your family page — there's no password, this link IS your login:`,
      link,
      ``,
      `Lost the link? Tap "Sign in" at shabboswithadas.com and enter this email address — that's it.`,
      ``,
      `We'll remind you before each Shabbos, and after Shabbos to check in. Every signup sent $5 to Tomchei Shabbos, and every check-in adds $1 more.`,
    ].join("\n");
    sendToHousehold(
      household,
      { subject: `Your family page — The Elul Shabbos Project`, text },
      "welcome",
      week
    ).catch(() => {});
  }

  return NextResponse.json({ token: household.token });
}
