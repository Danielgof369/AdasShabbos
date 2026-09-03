import { PrismaClient } from "@prisma/client";

/**
 * One-time cleanup, run on deploy: clears the pre-launch trial signups from
 * the national signup pool so the campaign starts from zero. Bounded so it
 * can never touch a real signup: only households created before the launch
 * cutoff below (the moment this was written, before the site was announced)
 * and with no check-ins. Safe to run repeatedly; it deletes nothing once
 * those rows are gone.
 */
const LAUNCH_CUTOFF = new Date("2026-09-03T18:49:00Z");
const prisma = new PrismaClient();
async function main() {
  const shul = await prisma.shul.findUnique({ where: { slug: "individuals" }, select: { id: true } });
  if (!shul) return;
  const targets = await prisma.household.findMany({
    where: {
      shulId: shul.id,
      createdAt: { lt: LAUNCH_CUTOFF },
      members: { none: { goals: { some: { checkedInAt: { not: null } } } } },
    },
    select: { id: true, familyName: true, city: true },
  });
  if (targets.length === 0) {
    console.log("cleanup-test-signups: nothing to remove");
    return;
  }
  await prisma.household.deleteMany({ where: { id: { in: targets.map((t) => t.id) } } });
  console.log(`cleanup-test-signups: removed ${targets.length} pre-launch household(s): ${targets.map((t) => `${t.familyName} (${t.city})`).join(", ")}`);
}
main().finally(() => prisma.$disconnect());
