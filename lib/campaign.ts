import type { Shul } from "@prisma/client";

/**
 * v2: campaign facts are derived per shul from its Shul row — dates,
 * timezone, pledge, charity. All week/date helpers keep their original
 * shapes so the rest of the app reads the same as v1.
 */
export type CampaignInfo = {
  shulId: string;
  name: string;
  seasonLabel: string;
  weeks: number;
  /** 0 when the shul has the pledge switched off. */
  pledgePerSignup: number;
  pledgeEnabled: boolean;
  charityName: string;
  raffleEnabled: boolean;
  rafflePrize: string;
  dates: Date[];
  timezone: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a shul's Shabbos calendar ("2026-08-22,..." + tz offset). */
export function shulDates(shul: Shul): Date[] {
  return shul.shabbosDates
    .split(",")
    .map((d) => new Date(`${d.trim()}T00:00:00${shul.tzOffset}`))
    .filter((d) => !Number.isNaN(d.getTime()));
}

export function campaignOf(shul: Shul): CampaignInfo {
  const dates = shulDates(shul);
  const pledgeEnabled = shul.pledgeEnabled && shul.pledgePerSignup > 0;
  return {
    shulId: shul.id,
    name: shul.campaignName,
    seasonLabel: shul.seasonLabel,
    weeks: dates.length,
    pledgePerSignup: pledgeEnabled ? shul.pledgePerSignup : 0,
    pledgeEnabled,
    charityName: shul.charityName,
    raffleEnabled: shul.raffleEnabled,
    rafflePrize: shul.rafflePrize,
    dates,
    timezone: shul.timezone,
  };
}

/**
 * The 1-based week number for `now`: week n ends with its Shabbos.
 * 0 = before the campaign window, weeks + 1 = after the last Shabbos.
 */
export function weekNumber(campaign: CampaignInfo, now = new Date()): number {
  const first = campaign.dates[0].getTime() - 6 * DAY_MS; // Sunday before Shabbos 1
  if (now.getTime() < first) return 0;
  for (let i = 0; i < campaign.dates.length; i++) {
    // week i+1 runs through the end of its Shabbos day
    if (now.getTime() <= campaign.dates[i].getTime() + DAY_MS) return i + 1;
  }
  return campaign.dates.length + 1;
}

/** The Shabbos (Saturday) that ends the given campaign week. */
export function shabbosOfWeek(campaign: CampaignInfo, week: number): Date {
  const clamped = Math.min(Math.max(week, 1), campaign.dates.length);
  return campaign.dates[clamped - 1];
}

/** Which week people should currently be signing up / checking in for. */
export function activeWeek(campaign: CampaignInfo, now = new Date()): number {
  const w = weekNumber(campaign, now);
  if (w < 1) return 1;
  if (w > campaign.weeks) return campaign.weeks;
  return w;
}

/**
 * Streak check-in deadline for a week: ~48 hours after Motzei Shabbos,
 * i.e. through Monday night. Late check-ins are still accepted and count
 * toward totals, just not streaks.
 */
export function checkinDeadline(campaign: CampaignInfo, week: number): Date {
  const shabbos = shabbosOfWeek(campaign, week);
  return new Date(shabbos.getTime() + 3 * DAY_MS);
}

export function formatShabbosDate(campaign: CampaignInfo, d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: campaign.timezone,
  });
}
