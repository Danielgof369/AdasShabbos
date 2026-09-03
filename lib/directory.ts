import { prisma } from "@/lib/db";
import { memo } from "@/lib/memo";
import type { DirectoryShul } from "@/components/national/ShulDirectory";

/** Every live, listed shul with its headline counts (cached a minute). */
export const listDirectoryShuls = memo("directory", 60_000, async (): Promise<DirectoryShul[]> => {
  const shuls = await prisma.shul.findMany({
    where: { active: true, approved: true, listed: true },
    orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    select: {
      id: true, slug: true, customDomain: true, name: true, city: true, state: true,
      partnerName: true,
      _count: { select: { households: true } },
    },
  });
  // People per shul in one grouped query (works on Postgres and SQLite).
  const rows = await prisma.$queryRaw<{ shulId: string; people: number | bigint }[]>`
    SELECT h."shulId" AS "shulId", COUNT(m."id") AS "people"
    FROM "Member" m JOIN "Household" h ON h."id" = m."householdId"
    GROUP BY h."shulId"`;
  const peopleBy = new Map(rows.map((r) => [r.shulId, Number(r.people)]));
  return shuls.map((s) => ({
    id: s.id,
    slug: s.slug,
    customDomain: s.customDomain,
    name: s.name,
    city: s.city,
    state: s.state,
    partnerName: s.partnerName,
    families: s._count.households,
    people: peopleBy.get(s.id) ?? 0,
  }));
});

export type CityHighlight = { label: string; value: number };
export type CityRow = {
  city: string;
  slug: string;
  region: string | null;
  families: number;
  people: number;
  children: number;
  /** Goals confirmed done, all weeks. */
  checkins: number;
  /** Rolled-up units from confirmed goals ("minutes of Torah learned"), biggest first. */
  highlights: CityHighlight[];
  /** Every spelling seen in the data ("Lakewood", "lakewood") so pages can query exactly. */
  variants: string[];
};

/** URL-safe key for a city name: "Ramat Beit Shemesh" -> "ramat-beit-shemesh". */
export function citySlug(city: string): string {
  return city
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^other:\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Families and people by city, across every approved shul (cached a minute). */
export const listCities = memo("cities", 60_000, async (): Promise<CityRow[]> => {
  const inShul = { shul: { active: true, approved: true } };
  const [rows, done] = await Promise.all([
    prisma.household.findMany({
      where: inShul,
      select: {
        city: true, region: true,
        shul: { select: { city: true, state: true, listed: true } },
        members: { select: { isChild: true } },
      },
    }),
    prisma.goal.findMany({
      where: { checkedInAt: { not: null }, member: { household: inShul } },
      select: {
        suggestion: { select: { unitLabel: true, unitValue: true } },
        member: { select: { household: { select: { city: true, shul: { select: { city: true, listed: true } } } } } },
      },
    }),
  ]);
  const cityOf = (h: { city: string | null; shul: { city: string; listed: boolean } }) =>
    (h.city ?? (h.shul.listed ? h.shul.city : null))?.trim() || null;
  const by = new Map<string, CityRow & { units: Map<string, number> }>();
  for (const h of rows) {
    const city = cityOf(h);
    if (!city) continue;
    const key = city.toLowerCase();
    const cur = by.get(key) ?? {
      city, slug: citySlug(city), region: h.region ?? h.shul.state ?? null,
      families: 0, people: 0, children: 0, checkins: 0, highlights: [] as CityHighlight[], variants: [] as string[], units: new Map<string, number>(),
    };
    if (!cur.variants.includes(city)) cur.variants.push(city);
    cur.families += 1;
    cur.people += h.members.length;
    cur.children += h.members.filter((m) => m.isChild).length;
    by.set(key, cur);
  }
  for (const g of done) {
    const city = cityOf(g.member.household);
    const cur = city ? by.get(city.toLowerCase()) : null;
    if (!cur) continue;
    cur.checkins += 1;
    if (g.suggestion) {
      cur.units.set(g.suggestion.unitLabel, (cur.units.get(g.suggestion.unitLabel) ?? 0) + g.suggestion.unitValue);
    }
  }
  return [...by.values()]
    .map(({ units, ...c }) => ({
      ...c,
      highlights: [...units.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => b.people - a.people || a.city.localeCompare(b.city));
});

/** One city's row by its URL slug, or null. */
export async function findCity(slug: string): Promise<CityRow | null> {
  const cities = await listCities();
  return cities.find((c) => c.slug === slug) ?? null;
}
