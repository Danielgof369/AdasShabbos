import { prisma } from "@/lib/db";
import { PLATFORM, isIsoDate } from "@/lib/platform";

/** The national season: label, Shabbos dates and timezone applied to every
 * shul families add from the national signup. Stored in Setting rows;
 * falls back to the env/code defaults in PLATFORM.season. */
export type Season = { label: string; dates: string[]; timezone: string };

export async function getSeason(): Promise<Season> {
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: "season." } } }).catch(() => []);
  const get = (k: string) => rows.find((r) => r.key === `season.${k}`)?.value;
  const dates = (get("dates") ?? "").split(",").map((d) => d.trim()).filter(isIsoDate);
  return {
    label: get("label") || PLATFORM.season.label,
    dates: dates.length ? dates : PLATFORM.season.dates,
    timezone: get("timezone") || PLATFORM.season.timezone,
  };
}

export async function saveSeason(season: Season): Promise<void> {
  const entries: [string, string][] = [
    ["season.label", season.label],
    ["season.dates", season.dates.join(",")],
    ["season.timezone", season.timezone],
  ];
  for (const [key, value] of entries) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
