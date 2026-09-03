import { prisma } from "@/lib/db";

/** A household needs at least this many signed-up people to be in the raffle. */
export const RAFFLE_MIN_PEOPLE = 3;

export type EligibleFamily = {
  id: string;
  familyName: string | null;
  token: string;
  people: number;
};

export type RaffleStanding = {
  /** In the hat: fully checked in AND at least RAFFLE_MIN_PEOPLE signed up. */
  eligible: EligibleFamily[];
  /** Fully checked in but too small to qualify — shown in admin so nobody wonders. */
  tooSmall: EligibleFamily[];
};

/**
 * Families for a week's pizza raffle: every member who has commitments for
 * that week has checked in on ALL of them (late check-ins count — the raffle
 * rewards doing it and reporting, not the streak window), and the household
 * has at least RAFFLE_MIN_PEOPLE signed up, so the prize goes to a family.
 * Members who joined after that week (no goals for it) don't block the family.
 */
export async function raffleStanding(week: number): Promise<RaffleStanding> {
  const households = await prisma.household.findMany({
    include: { members: { include: { goals: { where: { week } } } } },
    orderBy: { familyName: "asc" },
  });
  const fullyCheckedIn = households
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
  return {
    eligible: fullyCheckedIn.filter((f) => f.people >= RAFFLE_MIN_PEOPLE),
    tooSmall: fullyCheckedIn.filter((f) => f.people < RAFFLE_MIN_PEOPLE),
  };
}

export async function raffleEligible(week: number): Promise<EligibleFamily[]> {
  return (await raffleStanding(week)).eligible;
}

/**
 * All raffle draws so far, oldest week first. Returns [] if the RaffleDraw
 * table hasn't been created in the database yet (deploy/raffle.sql), so the
 * public pages never break on a missing table.
 */
export async function raffleDraws() {
  try {
    return await prisma.raffleDraw.findMany({ orderBy: { week: "asc" } });
  } catch {
    return [];
  }
}
