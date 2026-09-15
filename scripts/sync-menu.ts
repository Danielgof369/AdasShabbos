import { PrismaClient } from "@prisma/client";
import { SUGGESTION_TEMPLATE, SUGGESTION_RENAMES } from "../lib/suggestionTemplate";

/**
 * Runs on deploy: brings the national signup pool's commitment list in
 * line with lib/suggestionTemplate.ts. Rows are matched by title (or by
 * an entry in SUGGESTION_RENAMES), updated in place so families' existing
 * goals keep pointing at the same row, new items are created, and items
 * no longer in the template are switched off rather than deleted.
 */
const prisma = new PrismaClient();
async function main() {
  const shul = await prisma.shul.findUnique({ where: { slug: "individuals" }, select: { id: true } });
  if (!shul) {
    console.log("sync-menu: no national pool yet, nothing to do");
    return;
  }
  const existing = await prisma.suggestion.findMany({ where: { shulId: shul.id } });
  const byTitle = new Map(existing.map((s) => [s.title, s]));
  const seen = new Set<string>();
  let updated = 0, created = 0, deactivated = 0;
  for (const t of SUGGESTION_TEMPLATE) {
    const oldTitle = Object.entries(SUGGESTION_RENAMES).find(([, n]) => n === t.title)?.[0];
    const row = byTitle.get(t.title) ?? (oldTitle ? byTitle.get(oldTitle) : undefined);
    const data = { title: t.title, detail: t.detail, unitLabel: t.unitLabel, unitValue: t.unitValue, categories: t.categories, tier: t.tier, sortOrder: t.sortOrder, active: t.active };
    if (row) {
      await prisma.suggestion.update({ where: { id: row.id }, data });
      seen.add(row.id);
      updated++;
    } else {
      const made = await prisma.suggestion.create({ data: { ...data, shulId: shul.id } });
      seen.add(made.id);
      created++;
    }
  }
  for (const s of existing) {
    if (!seen.has(s.id) && s.active) {
      await prisma.suggestion.update({ where: { id: s.id }, data: { active: false } });
      deactivated++;
      console.log(`sync-menu: switched off "${s.title}"`);
    }
  }
  console.log(`sync-menu: ${updated} updated, ${created} created, ${deactivated} switched off`);
}
main().finally(() => prisma.$disconnect());
