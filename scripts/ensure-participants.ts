import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { PARTICIPANTS } from "../lib/participants";
import { SUGGESTION_TEMPLATE } from "../lib/suggestionTemplate";
import { PLATFORM, utcOffsetOn } from "../lib/platform";

/**
 * Runs on deploy: every participating shul in lib/participants.ts gets a
 * shul row (so kabalosshabbos.com/<slug> works), and national signups
 * whose "your shul" note matches are moved onto it. Idempotent.
 */
const prisma = new PrismaClient();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function main() {
  const individuals = await prisma.shul.findUnique({ where: { slug: "individuals" } });
  if (!individuals) {
    console.log("ensure-participants: no national pool yet, nothing to do");
    return;
  }
  for (const p of PARTICIPANTS) {
    let shul = await prisma.shul.findUnique({ where: { slug: p.slug } });
    const shared = { name: p.name, city: p.city, state: p.state ?? null, logoDark: p.logo, logoLight: p.logoLight ?? p.logo };
    if (!shul) {
      shul = await prisma.shul.create({
        data: {
          slug: p.slug, ...shared,
          hasSite: false, approved: true, listed: true, active: true,
          campaignName: PLATFORM.name, seasonLabel: individuals.seasonLabel,
          shabbosDates: individuals.shabbosDates, timezone: individuals.timezone,
          tzOffset: utcOffsetOn(individuals.timezone, individuals.shabbosDates.split(",")[0]),
          pledgeEnabled: false, pledgePerSignup: 0, raffleEnabled: false,
          adminHash: createHash("sha256").update(`elul:${p.slug}:${randomBytes(24).toString("hex")}`).digest("hex"),
          suggestions: { createMany: { data: SUGGESTION_TEMPLATE.map((t) => ({ ...t })) } },
        },
      });
      console.log(`ensure-participants: created shul "${p.name}" at /${p.slug}`);
    } else {
      await prisma.shul.update({ where: { id: shul.id }, data: { ...shared, approved: true, listed: true, active: true } });
    }
    const pool = await prisma.household.findMany({ where: { shulId: individuals.id, shulNote: { not: null } }, select: { id: true, shulNote: true } });
    const ids = pool.filter((h) => { const n = norm(h.shulNote ?? ""); return p.noteMatch.some((m) => n.includes(norm(m))); }).map((h) => h.id);
    if (ids.length) {
      await prisma.household.updateMany({ where: { id: { in: ids } }, data: { shulId: shul.id } });
      console.log(`ensure-participants: moved ${ids.length} famil${ids.length === 1 ? "y" : "ies"} onto /${p.slug}`);
    }
  }
  console.log("ensure-participants: done");
}
main().finally(() => prisma.$disconnect());
