import type { Shul } from "@prisma/client";

/**
 * Default "Why we're doing this" for shuls that haven't written their own.
 * Written for Elul 5786 (Rosh Hashanah on Shabbos); each shul can replace
 * it from /admin → Campaign settings.
 */
export const DEFAULT_WHY = `Before Rosh Hashanah 5784, many of us learned a teaching of the Aruch LaNer: when Rosh Hashanah falls on Shabbos and the shofar goes silent, the year that follows tends to be extraordinary, for blessing or for tragedy. On that day it is not the shofar that pleads for Klal Yisroel. It is Shabbos itself that stands as our meilitz yosher, our advocate. How we hold Shabbos becomes how the year holds us.

We all remember what came one month later. October 7th changed us, and demanded that we re-examine who we are and what we are committed to.

This year, Rosh Hashanah falls on Shabbos again.

So this Elul we are doing our part, every man, woman, and child, to send Shabbos into the new year as our advocate. One small commitment, each week, together.`;

/** Paragraphs for the "why" section: the shul's own text, or the default. */
export function whyParagraphs(shul: Pick<Shul, "whyText">): string[] {
  const text = (shul.whyText ?? "").trim() || DEFAULT_WHY;
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export type Announcement = {
  key: string;
  title: string;
  body: string | null;
  url: string | null;
};

/** The shul's homepage popup, if one is set. */
export function announcementOf(
  shul: Pick<Shul, "id" | "announcementTitle" | "announcementBody" | "announcementUrl" | "announcementUpdatedAt">
): Announcement | null {
  const title = (shul.announcementTitle ?? "").trim();
  if (!title) return null;
  return {
    key: `${shul.id}:${shul.announcementUpdatedAt?.getTime() ?? 0}`,
    title,
    body: (shul.announcementBody ?? "").trim() || null,
    url: (shul.announcementUrl ?? "").trim() || null,
  };
}

export function pluralWeeks(n: number): string {
  const words = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const w = words[n] ?? String(n);
  return `${w} ${n === 1 ? "Shabbos" : "Shabbosos"}`;
}
