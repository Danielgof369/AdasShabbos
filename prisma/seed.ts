import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { SUGGESTION_TEMPLATE, ADAS_TEMPLATE } from "../lib/suggestionTemplate";

const prisma = new PrismaClient();

function shulAdminHash(slug: string, password: string): string {
  return createHash("sha256").update(`elul:${slug}:${password}`).digest("hex");
}

const ADAS_WHY = `Before Rosh Hashanah 5784, Rabbi Revah shared a teaching of the Aruch LaNer: when Rosh Hashanah falls on Shabbos and the shofar goes silent, the year that follows tends to be extraordinary, for blessing or for tragedy. On that day it is not the shofar that pleads for Klal Yisroel. It is Shabbos itself that stands as our meilitz yosher, our advocate. How we hold Shabbos becomes how the year holds us.

We all remember what came one month later. October 7th changed us, and demanded that we re-examine who we are and what we are committed to.

This year, Rosh Hashanah falls on Shabbos again.

So this Elul we are doing our part, every man, woman, and child of Adas Torah, to send Shabbos into the new year as our advocate. One small commitment, each week, together.`;

const HELPERS_GUIDE = {
  kicker: "For Children",
  title: "The Shabbos Helpers Guide",
  description:
    "Fifteen jobs with titles worth owning — from “The Challah Helper” to “The Havdalah Holder” — with a fridge checklist to go with them.",
  url: "/shabbos-helpers-guide.pdf",
  emoji: "🖍️",
  sortOrder: 2,
};

async function main() {
  // The original deployment, as the first tenant.
  const adas = await prisma.shul.upsert({
    where: { slug: "adas" },
    update: {},
    create: {
      slug: "adas",
      customDomain: "shabboswithadas.com",
      name: "Adas Torah",
      approved: true,
      partnerName: "LINK Kollel",
      city: "Los Angeles",
      state: "CA",
      campaignName: "The Elul Shabbos Project",
      seasonLabel: "Elul 5786",
      charityName: "Tomchei Shabbos",
      pledgePerSignup: 5,
      rafflePrize: "pizza party",
      shabbosDates: "2026-08-22,2026-08-29,2026-09-05,2026-09-19",
      tzOffset: "-07:00",
      timezone: "America/Los_Angeles",
      logoDark: "/logo-white.png",
      logoLight: "/logo.png",
      partnerLogoDark: "/link-logo-white.png",
      partnerLogoLight: "/link-logo.png",
      whyText: ADAS_WHY,
      announcementTitle: "The Broken Water Heater",
      announcementBody:
        "A Dvar Halacha by Rabbi Yisroel Casen: a real-life shailah on melacha, maris ayin, and a mid-Shabbos repair call — bring it to your table this week.",
      announcementUrl: "/dvar-halacha-broken-water-heater.pdf",
      announcementUpdatedAt: new Date(),
      adminHash: shulAdminHash("adas", process.env.SEED_ADMIN_PASSWORD ?? "change-me"),
    },
  });

  if ((await prisma.suggestion.count({ where: { shulId: adas.id } })) === 0) {
    await prisma.suggestion.createMany({
      data: ADAS_TEMPLATE.map((t) => ({ ...t, shulId: adas.id })),
    });
    console.log(`Seeded ${ADAS_TEMPLATE.length} suggestions for ${adas.name}`);
  }
  if ((await prisma.resource.count({ where: { shulId: adas.id } })) === 0) {
    await prisma.resource.createMany({
      data: [
        {
          shulId: adas.id,
          kicker: "Dvar Halacha",
          title: "The Broken Water Heater",
          byline: "by Rabbi Yisroel Casen",
          description:
            "A real-life shailah on melacha, maris ayin, and a mid-Shabbos repair call — a real discussion-starter for the table.",
          url: "/dvar-halacha-broken-water-heater.pdf",
          emoji: "📖",
          sortOrder: 1,
        },
        { shulId: adas.id, ...HELPERS_GUIDE },
      ],
    });
  }
  console.log(`Shul ready: ${adas.name} (${adas.slug})`);

  // Optional demo tenant for local multi-shul testing: SEED_DEMO=1
  if (process.env.SEED_DEMO) {
    const demo = await prisma.shul.upsert({
      where: { slug: "demo" },
      update: {},
      create: {
        slug: "demo",
        name: "Young Israel of Demo",
        approved: true,
        city: "Chicago",
        state: "IL",
        contactName: "Demo Organizer",
        contactEmail: "demo@example.com",
        campaignName: "The Kabalas Shabbos Initiative",
        seasonLabel: "Elul 5786",
        shabbosDates: "2026-09-05,2026-09-12,2026-09-19",
        tzOffset: "-05:00",
        timezone: "America/Chicago",
        pledgeEnabled: false,
        pledgePerSignup: 0,
        rafflePrize: "ice cream party",
        adminHash: shulAdminHash("demo", "demo-pass-123"),
      },
    });
    if ((await prisma.suggestion.count({ where: { shulId: demo.id } })) === 0) {
      await prisma.suggestion.createMany({
        data: SUGGESTION_TEMPLATE.map((t) => ({ ...t, shulId: demo.id })),
      });
      await prisma.resource.create({ data: { shulId: demo.id, ...HELPERS_GUIDE, sortOrder: 1 } });
    }
    console.log(`Demo shul ready: ${demo.name} (${demo.slug})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
