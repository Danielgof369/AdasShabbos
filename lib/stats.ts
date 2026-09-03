import { prisma } from "@/lib/db";
import type { CampaignInfo } from "@/lib/campaign";
import { memo } from "@/lib/memo";

export type HighlightStat = { label: string; value: number };

/** Roll completed-goal counts per suggestion up by unit label. */
async function highlightsFromCounts(
  rows: { suggestionId: string | null; _count: { _all: number } }[]
): Promise<HighlightStat[]> {
  const ids = rows.map((r) => r.suggestionId).filter((id): id is string => !!id);
  if (ids.length === 0) return [];
  const suggestions = await prisma.suggestion.findMany({
    where: { id: { in: ids } },
    select: { id: true, unitLabel: true, unitValue: true },
  });
  const byId = new Map(suggestions.map((s) => [s.id, s]));
  const byUnit = new Map<string, number>();
  for (const r of rows) {
    const s = r.suggestionId ? byId.get(r.suggestionId) : null;
    if (!s) continue;
    byUnit.set(s.unitLabel, (byUnit.get(s.unitLabel) ?? 0) + s.unitValue * r._count._all);
  }
  return [...byUnit.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

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
      prisma.goal.groupBy({
        by: ["suggestionId"],
        where: { checkedInAt: { not: null }, suggestionId: { not: null }, ...inShul },
        _count: { _all: true },
      }),
    ]);

  const highlights = await highlightsFromCounts(doneGoals);

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
  cities: number;
  households: number;
  members: number;
  kids: number;
  checkins: number;
  pledgeTotal: number;
  highlights: HighlightStat[];
};

/** Roll-up across every active, listed shul for the national landing page.
 * Cached for a minute per server instance — it's on the busiest page. */
export const getNationalStats = memo("national-stats", 60_000, async (): Promise<NationalStats> => {
  const shuls = await prisma.shul.findMany({
    where: { active: true, approved: true },
    select: { id: true, pledgeEnabled: true, pledgePerSignup: true, listed: true },
  });
  const ids = shuls.map((s) => s.id);
  const inShuls = { member: { household: { shulId: { in: ids } } } };
  const [members, kids, checkins, doneGoals, perShul, cityRows] = await Promise.all([
    prisma.member.count({ where: { household: { shulId: { in: ids } } } }),
    prisma.member.count({ where: { isChild: true, household: { shulId: { in: ids } } } }),
    prisma.goal.count({ where: { checkedInAt: { not: null }, ...inShuls } }),
    prisma.goal.groupBy({
      by: ["suggestionId"],
      where: { checkedInAt: { not: null }, suggestionId: { not: null }, ...inShuls },
      _count: { _all: true },
    }),
    prisma.household.groupBy({
      by: ["shulId"],
      where: { shulId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.household.findMany({
      where: { shulId: { in: ids } },
      select: { city: true, shul: { select: { city: true, listed: true } } },
    }),
  ]);
  const cities = new Set(
    cityRows
      .map((h) => (h.city ?? (h.shul.listed ? h.shul.city : null))?.trim().toLowerCase())
      .filter((c): c is string => !!c)
  );
  const householdsBy = new Map(perShul.map((r) => [r.shulId, r._count._all]));
  let households = 0;
  let pledgeTotal = 0;
  for (const s of shuls) {
    const n = householdsBy.get(s.id) ?? 0;
    households += n;
    if (s.pledgeEnabled) pledgeTotal += n * s.pledgePerSignup;
  }
  const highlights = await highlightsFromCounts(doneGoals);
  return { shuls: shuls.filter((s) => s.listed).length, cities: cities.size, households, members, kids, checkins, pledgeTotal, highlights };
});
