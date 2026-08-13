import { prisma } from "@/lib/db";

export type CampaignInfo = {
  id: string;
  name: string;
  startDate: Date;
  weeks: number;
  signupDeadline: Date | null;
  pledgePerSignup: number;
  pledgePerCheckin: number;
  charityName: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getCampaign(): Promise<CampaignInfo> {
  const c = await prisma.campaign.findUnique({ where: { id: "campaign" } });
  if (c) return c;
  return prisma.campaign.create({
    data: { id: "campaign", startDate: new Date("2026-08-09T00:00:00-07:00") },
  });
}

/**
 * Campaign weeks run Sunday → Shabbos. Week 1 starts on campaign.startDate.
 * Returns the 1-based week number for `now`, clamped to [0, weeks + 1]:
 * 0 = before the campaign, weeks + 1 = after it ended.
 */
export function weekNumber(campaign: CampaignInfo, now = new Date()): number {
  const diff = now.getTime() - campaign.startDate.getTime();
  if (diff < 0) return 0;
  const week = Math.floor(diff / (7 * DAY_MS)) + 1;
  return week > campaign.weeks ? campaign.weeks + 1 : week;
}

/** The Shabbos (Saturday) that ends the given campaign week. */
export function shabbosOfWeek(campaign: CampaignInfo, week: number): Date {
  const start = new Date(campaign.startDate.getTime() + (week - 1) * 7 * DAY_MS);
  // Advance to the Saturday within [start, start + 6 days]
  const d = new Date(start);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d;
}

/** Which week people should currently be setting goals / checking in for. */
export function activeWeek(campaign: CampaignInfo, now = new Date()): number {
  const w = weekNumber(campaign, now);
  if (w < 1) return 1;
  if (w > campaign.weeks) return campaign.weeks;
  return w;
}

/**
 * Streak check-in deadline for a week: ~48 hours after Motzei Shabbos,
 * i.e. through Monday night (Tuesday 00:00 LA time). Late check-ins are
 * still accepted and count toward shul-wide totals, just not streaks.
 */
export function checkinDeadline(campaign: CampaignInfo, week: number): Date {
  const shabbos = shabbosOfWeek(campaign, week);
  return new Date(shabbos.getTime() + 3 * DAY_MS);
}

export function formatShabbosDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}
