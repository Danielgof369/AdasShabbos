import { prisma } from "@/lib/db";
import type { DirectoryShul } from "@/components/national/ShulDirectory";

/** Every live, listed shul with its headline counts. */
export async function listDirectoryShuls(): Promise<DirectoryShul[]> {
  const shuls = await prisma.shul.findMany({
    where: { active: true, listed: true },
    orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    select: {
      id: true, slug: true, customDomain: true, name: true, city: true, state: true,
      partnerName: true,
      _count: { select: { households: true } },
    },
  });
  const people = await prisma.member.groupBy({
    by: ["householdId"],
    where: { household: { shulId: { in: shuls.map((s) => s.id) } } },
    _count: { _all: true },
  });
  // householdId -> shulId map for the roll-up
  const hh = await prisma.household.findMany({
    where: { shulId: { in: shuls.map((s) => s.id) } },
    select: { id: true, shulId: true },
  });
  const shulOfHousehold = new Map(hh.map((h) => [h.id, h.shulId]));
  const peopleBy = new Map<string, number>();
  for (const p of people) {
    const sid = shulOfHousehold.get(p.householdId);
    if (sid) peopleBy.set(sid, (peopleBy.get(sid) ?? 0) + p._count._all);
  }
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
}
