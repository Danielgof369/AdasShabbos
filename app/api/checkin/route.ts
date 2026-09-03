import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findShulByHost, householdShulAllowed } from "@/lib/tenant";
import { forget } from "@/lib/memo";

export async function POST(req: NextRequest) {
  let body: { token?: unknown; goalId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const goalId = typeof body.goalId === "string" ? body.goalId : "";
  if (!token || !goalId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const shul = await findShulByHost(req.headers.get("host"));
  if (shul && !shul.approved) {
    return NextResponse.json({ error: "This campaign isn't open yet — check back soon." }, { status: 403 });
  }
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { member: { include: { household: { include: { shul: true } } } } },
  });
  if (
    !goal ||
    goal.member.household.token !== token ||
    !householdShulAllowed(shul, goal.member.household) ||
    !goal.member.household.shul.approved
  ) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!goal.checkedInAt) {
    await prisma.goal.update({
      where: { id: goal.id },
      data: { checkedInAt: new Date() },
    });
    forget("national-stats");
  }

  return NextResponse.json({ ok: true });
}
