import { memo } from "@/lib/memo";
import type { SuggestionOption } from "@/lib/types";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { PLATFORM, utcOffsetOn } from "@/lib/platform";
import { SUGGESTION_TEMPLATE } from "@/lib/suggestionTemplate";
import { getSeason } from "@/lib/season";
import type { Shul } from "@prisma/client";

/**
 * The catch-all "shul" for people who sign up on their own. Unlisted, no
 * site, no admin. Nobody can create a real shul from the public site: the
 * operator adds shuls at /platform (often from the "my shul is…" notes
 * individuals leave), and moves those families over.
 */
export const INDIVIDUALS_SLUG = "individuals";

export async function getIndividualsShul(): Promise<Shul> {
  const existing = await prisma.shul.findUnique({ where: { slug: INDIVIDUALS_SLUG } });
  if (existing) return existing;
  const season = await getSeason();
  return prisma.shul.create({
    data: {
      slug: INDIVIDUALS_SLUG,
      name: `${PLATFORM.name} — individuals`,
      city: "Everywhere",
      hasSite: false,
      approved: true,
      listed: false,
      campaignName: PLATFORM.name,
      seasonLabel: season.label,
      shabbosDates: season.dates.join(","),
      timezone: season.timezone,
      tzOffset: utcOffsetOn(season.timezone, season.dates[0]),
      pledgeEnabled: false,
      pledgePerSignup: 0,
      raffleEnabled: false,
      adminHash: createHash("sha256").update(`elul:${INDIVIDUALS_SLUG}:${randomBytes(24).toString("hex")}`).digest("hex"),
      suggestions: { createMany: { data: SUGGESTION_TEMPLATE.map((t) => ({ ...t })) } },
    },
  });
}

export function isIndividuals(shul: Pick<Shul, "slug">): boolean {
  return shul.slug === INDIVIDUALS_SLUG;
}

/** The commitment menu people pick from at signup (shown on the home page too). */
export const getNationalMenu = memo("menu", 60_000, async (): Promise<SuggestionOption[]> => {
  const shul = await getIndividualsShul();
  return prisma.suggestion.findMany({
    where: { shulId: shul.id, active: true, tier: { not: "kehilla" } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, detail: true, categories: true, tier: true },
  });
});
