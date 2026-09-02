/**
 * Platform-wide brand + onboarding rules for Kabalos Shabbos, the national
 * network of shul Shabbos campaigns.
 */
export const PLATFORM = {
  name: "Kabalos Shabbos",
  tagline: "One small thing for Shabbos. Every week. Every shul.",
  /** Where questions and change requests go. A person (and an agent)
   * reads this inbox — see deploy/SUPPORT.md. */
  contactEmail: process.env.PLATFORM_CONTACT_EMAIL ?? "support@kabbolasshabbos.com",
  /** The platform operator, notified on every self-serve signup. */
  notifyEmail: process.env.PLATFORM_NOTIFY_EMAIL ?? "daniel@gflowsystems.com",
  origin: { shul: "Adas Torah", city: "Los Angeles", season: "Elul 5786" },
  /** Program partner shown beside the initiative's logo. */
  partner: { name: "Kedushas Shabbos", logoLight: "/kedushas-shabbos.png", logoDark: "/kedushas-shabbos-white.png" },
  /** Credit line in the national footer. */
  builder: { name: "SHFA.ai", url: process.env.BUILDER_URL ?? "https://shfa.ai" },
  /** Fallback season for shuls families add from the national signup;
   * the live values are edited at /platform (see lib/season.ts). */
  season: {
    label: process.env.NATIONAL_SEASON_LABEL ?? "Elul 5786",
    dates: (process.env.NATIONAL_SHABBOS_DATES ?? "2026-09-05,2026-09-19").split(",").map((d) => d.trim()).filter(Boolean),
    timezone: process.env.NATIONAL_TIMEZONE ?? "America/New_York",
  },
};

export type Tier = "individual" | "family" | "kehilla";
export const TIERS: { key: Tier; title: string; blurb: string }[] = [
  { key: "individual", title: "Individual", blurb: "One person, one small thing, every Shabbos." },
  { key: "family", title: "Family", blurb: "Taken on together at the Shabbos table." },
  { key: "kehilla", title: "Kehilla", blurb: "What the whole shul commits to, led by the rav." },
];

/** Subdomains that can never be claimed by a shul. */
export const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "platform", "start", "shuls", "mail", "email",
  "smtp", "imap", "ftp", "cdn", "static", "assets", "img", "images", "blog",
  "docs", "help", "support", "status", "dev", "staging", "test", "demo",
  "vercel", "kabbalasshabbos", "kabbalas", "kabolas", "kabolasshabbos", "kabbolas", "kabbolasshabbos", "kabalas", "kabalasshabbos", "kabalos", "kabalosshabbos", "initiative", "shabbos", "shabbat", "national",
  "us", "ca", "il", "ny", "nj", "la", "chicago", "root", "null", "undefined",
]);

export function cleanSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function slugProblem(slug: string): string | null {
  if (!slug) return "Pick a web address.";
  if (slug.length < 3) return "At least 3 characters.";
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) return "Letters, numbers and dashes only.";
  if (RESERVED_SLUGS.has(slug)) return "That one's reserved — try another.";
  return null;
}

/** Slug suggestion from a shul name: "Young Israel of Chicago" -> "yichicago"-ish. */
export function suggestSlug(name: string): string {
  const stop = new Set(["of", "the", "and", "congregation", "cong", "kehilas", "kehillas", "kehillat", "k", "shul", "synagogue", "center", "centre"]);
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((w) => !stop.has(w));
  const base = (kept.length ? kept : words).join("");
  return cleanSlug(base).slice(0, 24);
}

/** US-centric timezone choices for the onboarding form. */
export const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (New York, NJ, Baltimore, Miami)" },
  { value: "America/Chicago", label: "Central (Chicago, Dallas, Houston, St. Louis)" },
  { value: "America/Denver", label: "Mountain (Denver, Phoenix area varies)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles, Seattle, Las Vegas)" },
  { value: "America/Toronto", label: "Toronto / Montreal" },
  { value: "Asia/Jerusalem", label: "Israel" },
  { value: "Europe/London", label: "London / Manchester" },
];

/** UTC offset ("-05:00") of an IANA zone on a given calendar date. */
export function utcOffsetOn(timezone: string, isoDate: string): string {
  const probe = new Date(`${isoDate}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(probe);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  const minutes = Math.round((local - probe.getTime()) / 60000);
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** The next N Saturdays starting on/after a given date (YYYY-MM-DD). */
export function saturdaysFrom(isoDate: string, count: number): string[] {
  const [y, m, d] = isoDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  while (cursor.getUTCDay() !== 6) cursor.setUTCDate(cursor.getUTCDate() + 1);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return out;
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
}
