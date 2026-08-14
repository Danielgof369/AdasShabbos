import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCampaign } from "@/lib/campaign";
import { nextShabbosWeek } from "@/lib/household";

/**
 * Adjust a member's commitment set. The new set applies to every remaining
 * week of the campaign (weeks whose Shabbos hasn't arrived yet); completed
 * or checked-in weeks are never touched.
 */
export async function POST(req: NextRequest) {
  let body: {
    token?: unknown;
    memberId?: unknown;
    suggestionIds?: unknown;
    customTitle?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!token || !memberId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { household: true },
  });
  if (!member || member.household.token !== token) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const validIds = new Set(
    (await prisma.suggestion.findMany({ where: { active: true }, select: { id: true } })).map(
      (s) => s.id
    )
  );
  const suggestionIds = (Array.isArray(body.suggestionIds) ? body.suggestionIds : [])
    .filter((id): id is string => typeof id === "string" && validIds.has(id))
    .slice(0, 6);
  const customTitle =
    typeof body.customTitle === "string" && body.customTitle.trim()
      ? body.customTitle.trim().slice(0, 120)
      : null;
  if (suggestionIds.length === 0 && !customTitle) {
    return NextResponse.json({ error: "Pick at least one commitment." }, { status: 400 });
  }

  const campaign = await getCampaign();
  const fromWeek = nextShabbosWeek(campaign);
  if (fromWeek > campaign.weeks) {
    return NextResponse.json(
      { error: "The campaign has wrapped up — commitments can no longer change." },
      { status: 400 }
    );
  }

  // Replace unchecked goals from the next Shabbos onward.
  await prisma.goal.deleteMany({
    where: { memberId, week: { gte: fromWeek }, checkedInAt: null },
  });
  for (let w = fromWeek; w <= campaign.weeks; w++) {
    for (const suggestionId of suggestionIds) {
      await prisma.goal.create({ data: { memberId, week: w, suggestionId } });
    }
    if (customTitle) {
      await prisma.goal.create({ data: { memberId, week: w, customTitle } });
    }
  }

  return NextResponse.json({ ok: true });
}
