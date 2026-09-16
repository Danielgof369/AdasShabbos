import { PrismaClient } from "@prisma/client";
import { SUGGESTION_TEMPLATE, SUGGESTION_RENAMES } from "../lib/suggestionTemplate";
import { PARTICIPANTS } from "../lib/participants";

/**
 * Runs on deploy: brings the commitment list of every national-pool shul
 * (the individuals pool and each participating shul) in line with
 * lib/suggestionTemplate.ts. Rows are matched by title + audience, then by
 * title, then by a renamed title, and updated in place so families'
 * existing goals keep pointing at the same row. New items are created;
 * items no longer in the template are switched off, never deleted.
 */
const prisma = new PrismaClient();

async function syncShul(shulId: string, label: string, hideKehilla: string[] = []) {
  // Kehilla items this shul opted out of: never created, removed if present
  // (kehilla rows carry no family goals, so a plain delete is safe).
  if (hideKehilla.length) {
    const gone = await prisma.suggestion.deleteMany({ where: { shulId, tier: "kehilla", title: { in: hideKehilla } } });
    if (gone.count) console.log(`sync-menu [${label}]: removed ${gone.count} kehilla item(s) this shul opted out of`);
  }
  const template = SUGGESTION_TEMPLATE.filter((t) => !(t.tier === "kehilla" && hideKehilla.includes(t.title)));
  const existing = await prisma.suggestion.findMany({ where: { shulId } });
  const used = new Set<string>();
  const pick = (title: string, categories: string) => {
    const free = existing.filter((s) => !used.has(s.id));
    const renamedTo = (s: { title: string }) => SUGGESTION_RENAMES[s.title];
    return (
      free.find((s) => s.title === title && s.categories === categories) ??
      free.find((s) => renamedTo(s) === title && s.categories === categories) ??
      free.find((s) => s.title === title) ??
      free.find((s) => renamedTo(s) === title)
    );
  };
  let updated = 0, created = 0, deactivated = 0;
  for (const t of template) {
    const data = { title: t.title, detail: t.detail, unitLabel: t.unitLabel, unitValue: t.unitValue, categories: t.categories, tier: t.tier, sortOrder: t.sortOrder, active: t.active };
    const row = pick(t.title, t.categories);
    if (row) {
      await prisma.suggestion.update({ where: { id: row.id }, data });
      used.add(row.id);
      updated++;
    } else {
      const made = await prisma.suggestion.create({ data: { ...data, shulId } });
      used.add(made.id);
      created++;
    }
  }
  for (const s of existing) {
    if (!used.has(s.id) && s.active) {
      await prisma.suggestion.update({ where: { id: s.id }, data: { active: false } });
      deactivated++;
      console.log(`sync-menu [${label}]: switched off "${s.title}"`);
    }
  }
  console.log(`sync-menu [${label}]: ${updated} updated, ${created} created, ${deactivated} switched off`);
}

async function main() {
  const slugs = ["individuals", ...PARTICIPANTS.map((p) => p.slug)];
  const shuls = await prisma.shul.findMany({ where: { slug: { in: slugs }, hasSite: false }, select: { id: true, slug: true } });
  if (shuls.length === 0) {
    console.log("sync-menu: no national pool yet, nothing to do");
    return;
  }
  for (const s of shuls) await syncShul(s.id, s.slug, PARTICIPANTS.find((p) => p.slug === s.slug)?.hideKehilla ?? []);
}
main().finally(() => prisma.$disconnect());
