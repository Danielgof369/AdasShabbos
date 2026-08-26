import { prisma } from "@/lib/db";

export type EligibleFamily = {
  id: string;
  familyName: string | null;
  token: string;
  people: number;
};

/**
 * Families eligible for a shul's weekly pizza raffle: every member who has
 * commitments for that week has checked in on ALL of them (late check-ins
 * count). Members who joined after that week don't block the family.
 */
export async function raffleEligible(shulId: string, week: number): Promise<EligibleFamily[]> {
  const households = await prisma.household.findMany({
    where: { shulId },
    include: { members: { include: { goals: { where: { week } } } } },
    orderBy: { familyName: "asc" },
  });
  return households
    .filter((h) => {
      const withGoals = h.members.filter((m) => m.goals.length > 0);
      if (withGoals.length === 0) return false;
      return withGoals.every((m) => m.goals.every((g) => g.checkedInAt));
    })
    .map((h) => ({
      id: h.id,
      familyName: h.familyName,
      token: h.token,
      people: h.members.length,
    }));
}

/** A shul's raffle draws so far, oldest week first. */
export async function raffleDraws(shulId: string) {
  try {
    return await prisma.raffleDraw.findMany({
      where: { shulId },
      orderBy: { week: "asc" },
    });
  } catch {
    return [];
  }
}
