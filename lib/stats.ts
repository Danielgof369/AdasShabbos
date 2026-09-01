import { prisma } from "@/lib/db";
import type { CampaignInfo } from "@/lib/campaign";

export type HighlightStat = { label: string; value: number };

export type CampaignStats = {
  households: number;
  members: number;
  kids: number;
  checkins: number;
  goalsThisWeek: number;
  pledgeTotal: number;
  charityName: string;
  highlights: HighlightStat[];
};

export async function getCampaignStats(
  campaign: CampaignInfo,
  activeWeek: number
): Promise<CampaignStats> {
  const shulId = campaign.shulId;
  const inShul = { member: { household: { shulId } } };

  const [households, members, kids, checkins, goalsThisWeek, doneGoals] =
    await Promise.all([
      prisma.household.count({ where: { shulId } }),
      prisma.member.count({ where: { household: { shulId } } }),
      prisma.member.count({ where: { isChild: true, household: { shulId } } }),
      prisma.goal.count({ where: { checkedInAt: { not: null }, ...inShul } }),
      prisma.goal.count({ where: { week: activeWeek, ...inShul } }),
      prisma.goal.findMany({
        where: { checkedInAt: { not: null }, suggestionId: { not: null }, ...inShul },
        include: { suggestion: true },
      }),
    ]);

  // Roll completed goals up by their suggestion's unit for the highlight reel.
  const byUnit = new Map<string, number>();
  for (const g of doneGoals) {
    if (!g.suggestion) continue;
    const { unitLabel, unitValue } = g.suggestion;
    byUnit.set(unitLabel, (byUnit.get(unitLabel) ?? 0) + unitValue);
  }
  const highlights = [...byUnit.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return {
    households,
    members,
    kids,
    checkins,
    goalsThisWeek,
    pledgeTotal: households * campaign.pledgePerSignup,
    charityName: campaign.charityName,
    highlights,
  };
}

export type NationalStats = {
  shuls: number;
  households: number;
  members: number;
  kids: number;
  checkins: number;
  pledgeTotal: number;
  highlights: HighlightStat[];
};

/** Roll-up across every active, listed shul for the national landing page. */
export async function getNationalStats(): Promise<NationalStats> {
  const shuls = await prisma.shul.findMany({
    where: { active: true, listed: true },
    select: { id: true, pledgeEnabled: true, pledgePerSignup: true },
  });
  const ids = shuls.map((s) => s.id);
  const inShuls = { member: { household: { shulId: { in: ids } } } };
  const [members, kids, checkins, doneGoals, perShul] = await Promise.all([
    prisma.member.count({ where: { household: { shulId: { in: ids } } } }),
    prisma.member.count({ where: { isChild: true, household: { shulId: { in: ids } } } }),
    prisma.goal.count({ where: { checkedInAt: { not: null }, ...inShuls } }),
    prisma.goal.findMany({
      where: { checkedInAt: { not: null }, suggestionId: { not: null }, ...inShuls },
      include: { suggestion: { select: { unitLabel: true, unitValue: true } } },
    }),
    prisma.household.groupBy({
      by: ["shulId"],
      where: { shulId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  const householdsBy = new Map(perShul.map((r) => [r.shulId, r._count._all]));
  let households = 0;
  let pledgeTotal = 0;
  for (const s of shuls) {
    const n = householdsBy.get(s.id) ?? 0;
    households += n;
    if (s.pledgeEnabled) pledgeTotal += n * s.pledgePerSignup;
  }
  const byUnit = new Map<string, number>();
  for (const g of doneGoals) {
    if (!g.suggestion) continue;
    byUnit.set(g.suggestion.unitLabel, (byUnit.get(g.suggestion.unitLabel) ?? 0) + g.suggestion.unitValue);
  }
  const highlights = [...byUnit.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  return { shuls: shuls.length, households, members, kids, checkins, pledgeTotal, highlights };
}
