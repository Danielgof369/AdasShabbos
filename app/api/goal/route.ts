import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCampaign } from "@/lib/campaign";
import { nextShabbosWeek, goalTitle } from "@/lib/household";

export async function POST(req: NextRequest) {
  let body: {
    token?: unknown;
    memberId?: unknown;
    week?: unknown;
    suggestionId?: unknown;
    customTitle?: unknown;
    sameAgain?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const week = typeof body.week === "number" ? body.week : NaN;
  if (!token || !memberId || !Number.isInteger(week)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { household: true, goals: { include: { suggestion: true } } },
  });
  if (!member || member.household.token !== token) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const campaign = await getCampaign();
  const minWeek = Math.min(nextShabbosWeek(campaign), campaign.weeks);
  if (week < minWeek || week > campaign.weeks) {
    return NextResponse.json(
      { error: "That week isn't open for goal-setting." },
      { status: 400 }
    );
  }

  let suggestionId: string | null = null;
  let customTitle: string | null = null;

  if (body.sameAgain === true) {
    const sorted = [...member.goals].sort((a, b) => b.week - a.week);
    const last = sorted.find((g) => g.week !== week) ?? sorted[0];
    if (!last) {
      return NextResponse.json(
        { error: "No previous commitment to repeat — pick one instead." },
        { status: 400 }
      );
    }
    suggestionId = last.suggestionId;
    customTitle = last.suggestionId ? null : (last.customTitle ?? goalTitle(last));
  } else if (typeof body.suggestionId === "string" && body.suggestionId) {
    const s = await prisma.suggestion.findFirst({
      where: { id: body.suggestionId, active: true },
    });
    if (!s) {
      return NextResponse.json({ error: "That option is no longer available." }, { status: 400 });
    }
    suggestionId = s.id;
  } else if (typeof body.customTitle === "string" && body.customTitle.trim()) {
    customTitle = body.customTitle.trim().slice(0, 120);
  } else {
    return NextResponse.json({ error: "Pick a commitment." }, { status: 400 });
  }

  await prisma.goal.upsert({
    where: { memberId_week: { memberId, week } },
    update: { suggestionId, customTitle },
    create: { memberId, week, suggestionId, customTitle },
  });

  return NextResponse.json({ ok: true });
}
