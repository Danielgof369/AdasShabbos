import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCampaign, activeWeek } from "@/lib/campaign";
import { normalizePhone, normalizeEmail } from "@/lib/contact";

type MemberInput = {
  name?: unknown;
  isChild?: unknown;
  gender?: unknown;
  suggestionId?: unknown;
  customTitle?: unknown;
};

export async function POST(req: NextRequest) {
  let body: { phone?: unknown; email?: unknown; members?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";

  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) {
    return NextResponse.json(
      { error: "That phone number doesn't look right — please double-check it." },
      { status: 400 }
    );
  }
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (rawEmail && !email) {
    return NextResponse.json(
      { error: "That email doesn't look right — please double-check it." },
      { status: 400 }
    );
  }
  if (!phone && !email) {
    return NextResponse.json(
      { error: "Please provide a phone number or email." },
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

  const cleanMembers: { name: string; isChild: boolean; gender: string | null; suggestionId: string | null; customTitle: string | null }[] = [];
  for (const m of members) {
    const name = typeof m.name === "string" ? m.name.trim().slice(0, 60) : "";
    if (!name) {
      return NextResponse.json({ error: "Every person needs a name." }, { status: 400 });
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
    const gender =
      m.isChild === true && (m.gender === "boy" || m.gender === "girl")
        ? m.gender
        : null;
    cleanMembers.push({ name, isChild: m.isChild === true, gender, suggestionId, customTitle });
  }

  // Reuse an existing household for the same contact so families can add
  // people later without splitting their check-in link.
  const existing = await prisma.household.findFirst({
    where: {
      OR: [
        ...(phone ? [{ phone }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
  });

  const household =
    existing ??
    (await prisma.household.create({
      data: {
        token: randomBytes(9).toString("base64url"),
        phone,
        email,
      },
    }));

  if (existing) {
    // Fill in any newly provided contact channel.
    await prisma.household.update({
      where: { id: existing.id },
      data: {
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
        isChild: m.isChild,
        gender: m.gender,
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

  return NextResponse.json({ token: household.token });
}
