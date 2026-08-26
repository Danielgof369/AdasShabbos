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
