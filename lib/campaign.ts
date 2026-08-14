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

/**
 * The campaign's Shabbos dates (LA time). Week 4 is Shabbos Shuva;
 * Rosh Hashanah (Sept 12) is deliberately skipped, so week 3 -> week 4
 * spans two calendar weeks.
 */
export const SHABBOS_DATES = [
  new Date("2026-08-22T00:00:00-07:00"),
  new Date("2026-08-29T00:00:00-07:00"),
  new Date("2026-09-05T00:00:00-07:00"),
  new Date("2026-09-19T00:00:00-07:00"),
];

export async function getCampaign(): Promise<CampaignInfo> {
  const c = await prisma.campaign.findUnique({ where: { id: "campaign" } });
  if (c) return { ...c, weeks: SHABBOS_DATES.length };
  const created = await prisma.campaign.create({
    data: { id: "campaign", startDate: new Date("2026-08-16T00:00:00-07:00") },
  });
  return { ...created, weeks: SHABBOS_DATES.length };
}

/**
 * The 1-based week number for `now`: week n ends with its Shabbos.
 * 0 = before the campaign window, weeks + 1 = after the last Shabbos.
 */
export function weekNumber(_campaign: CampaignInfo, now = new Date()): number {
  const first = SHABBOS_DATES[0].getTime() - 6 * DAY_MS; // Sunday before Shabbos 1
  if (now.getTime() < first) return 0;
  for (let i = 0; i < SHABBOS_DATES.length; i++) {
    // week i+1 runs through the end of its Shabbos day
    if (now.getTime() <= SHABBOS_DATES[i].getTime() + DAY_MS) return i + 1;
  }
  return SHABBOS_DATES.length + 1;
}

/** The Shabbos (Saturday) that ends the given campaign week. */
export function shabbosOfWeek(_campaign: CampaignInfo, week: number): Date {
  const clamped = Math.min(Math.max(week, 1), SHABBOS_DATES.length);
  return SHABBOS_DATES[clamped - 1];
}

/** Which week people should currently be checking in for. */
export function activeWeek(campaign: CampaignInfo, now = new Date()): number {
  const w = weekNumber(campaign, now);
  if (w < 1) return 1;
  if (w > SHABBOS_DATES.length) return SHABBOS_DATES.length;
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
