import { PrismaClient } from "@prisma/client";

/**
 * One-time cleanup, run on deploy: removes the pre-launch "Test" family
 * from the national signup pool. Bounded three ways so it can never touch
 * a real signup: the family name must be exactly "Test", it must have been
 * created before launch day (2026-09-04), and it must have no check-ins.
 * Safe to run repeatedly; it deletes nothing once the row is gone.
 */
const prisma = new PrismaClient();
async function main() {
  const shul = await prisma.shul.findUnique({ where: { slug: "individuals" }, select: { id: true } });
  if (!shul) return;
  const targets = await prisma.household.findMany({
    where: {
      shulId: shul.id,
      familyName: "Test",
      createdAt: { lt: new Date("2026-09-04T00:00:00Z") },
      members: { none: { goals: { some: { checkedInAt: { not: null } } } } },
    },
    select: { id: true, familyName: true, city: true },
  });
  if (targets.length === 0) {
    console.log("cleanup-test-signups: nothing to remove");
    return;
  }
  await prisma.household.deleteMany({ where: { id: { in: targets.map((t) => t.id) } } });
  console.log(`cleanup-test-signups: removed ${targets.length} test household(s): ${targets.map((t) => `${t.familyName} (${t.city})`).join(", ")}`);
}
main().finally(() => prisma.$disconnect());
