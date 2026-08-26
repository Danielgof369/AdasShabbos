import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { SUGGESTION_TEMPLATE } from "../lib/suggestionTemplate";

const prisma = new PrismaClient();

function shulAdminHash(slug: string, password: string): string {
  return createHash("sha256").update(`elul:${slug}:${password}`).digest("hex");
}

async function main() {
  // The original deployment, as the first tenant.
  const adas = await prisma.shul.upsert({
    where: { slug: "adas" },
    update: {},
    create: {
      slug: "adas",
      customDomain: "shabboswithadas.com",
      name: "Adas Torah",
      partnerName: "LINK Kollel",
      city: "Los Angeles",
      campaignName: "The Elul Shabbos Project",
      charityName: "Tomchei Shabbos",
      pledgePerSignup: 5,
      shabbosDates: "2026-08-22,2026-08-29,2026-09-05,2026-09-19",
      tzOffset: "-07:00",
      timezone: "America/Los_Angeles",
      logoDark: "/logo-white.png",
      logoLight: "/logo.png",
      partnerLogoDark: "/link-logo-white.png",
      partnerLogoLight: "/link-logo.png",
      adminHash: shulAdminHash("adas", process.env.SEED_ADMIN_PASSWORD ?? "change-me"),
    },
  });

  const existing = await prisma.suggestion.count({ where: { shulId: adas.id } });
  if (existing === 0) {
    await prisma.suggestion.createMany({
      data: SUGGESTION_TEMPLATE.map((t) => ({ ...t, shulId: adas.id })),
    });
    console.log(`Seeded ${SUGGESTION_TEMPLATE.length} suggestions for ${adas.name}`);
  }
  console.log(`Shul ready: ${adas.name} (${adas.slug})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
