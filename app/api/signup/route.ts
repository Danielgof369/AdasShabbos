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
  suggestionId?: unknown;
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
    category: string;
    suggestionId: string | null;
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
    const suggestionId =
      typeof m.suggestionId === "string" && validSuggestionIds.has(m.suggestionId)
        ? m.suggestionId
        : null;
    const customTitle =
      typeof m.customTitle === "string" && m.customTitle.trim()
        ? m.customTitle.trim().slice(0, 120)
        : null;
    if (!suggestionId && !customTitle) {
      return NextResponse.json(
        { error: `Pick a commitment for ${name}.` },
        { status: 400 }
      );
    }
    cleanMembers.push({ name, category: m.category, suggestionId, customTitle });
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

  for (const m of cleanMembers) {
    const member = await prisma.member.create({
      data: {
        householdId: household.id,
        name: m.name,
        gender: m.category,
        isChild: isChildCategory(m.category as "boy" | "girl" | "man" | "woman"),
      },
    });
    await prisma.goal.create({
      data: {
        memberId: member.id,
        week,
        suggestionId: m.suggestionId,
        customTitle: m.customTitle,
      },
    });
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
      .map((m) => `• ${m.name}: ${m.goals[0].suggestion?.title ?? m.goals[0].customTitle}`);
    const text = [
      `Welcome to the Elul Shabbos Project! 🕯️`,
      ``,
      `The ${familyName} family is signed up for Shabbos ${formatShabbosDate(shabbosOfWeek(campaign, week))}:`,
      ...lines,
      ``,
      `Your family page (save this email — it's your link for check-ins and streaks):`,
      link,
      ``,
      `We'll remind you before Shabbos, and after Shabbos to check in. Every signup sent $5 to Tomchei Shabbos, and every check-in adds $1 more.`,
    ].join("\n");
    // Fire-and-forget: never block or fail the signup on email trouble.
    sendToHousehold(
      household,
      { subject: `Your family page — The Elul Shabbos Project`, text },
      "welcome",
      week
    ).catch(() => {});
  }

  return NextResponse.json({ token: household.token });
}
