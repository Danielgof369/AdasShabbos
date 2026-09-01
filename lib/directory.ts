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
