import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The real campaign list. unitLabel/unitValue drive the homepage highlight
// reel — every check-in adds unitValue to that label's running total.
const suggestions = [
  // ---- Adults ----
  {
    title: "Learn Hilchos Shabbos at the table",
    detail: "A few minutes of practical halacha at the seudah — suggested topics coming soon.",
    unitLabel: "tables learning Hilchos Shabbos",
    unitValue: 1,
    audience: "adult",
    sortOrder: 1,
  },
  {
    title: "Prepare and say a dvar Torah at the table",
    detail: "Prepare something on the parsha to share at the seudah.",
    unitLabel: "divrei Torah shared",
    unitValue: 1,
    audience: "adult",
    sortOrder: 2,
  },
  {
    title: "Keep your phone off until Rabbeinu Tam",
    detail: "Don't turn your phone back on until Rabbeinu Tam's zman after Shabbos.",
    unitLabel: "minutes added to Shabbos",
    unitValue: 30,
    audience: "adult",
    sortOrder: 3,
  },
  {
    title: "Come 20 minutes early Shabbos morning",
    detail: "Come early to learn or attend the shiur before davening.",
    unitLabel: "minutes of extra learning",
    unitValue: 20,
    audience: "adult",
    sortOrder: 4,
  },
  {
    title: "Eat a proper Melava Malka",
    detail: "Escort the Shabbos Queen out properly on Motzei Shabbos.",
    unitLabel: "Melava Malkas eaten",
    unitValue: 1,
    audience: "adult",
    sortOrder: 5,
  },
  {
    title: "Set the Shabbos table Thursday night",
    detail: "Walk into Friday with the table already glowing.",
    unitLabel: "tables set early",
    unitValue: 1,
    audience: "adult",
    sortOrder: 6,
  },
  {
    title: "Be dressed in bigdei Shabbos by hadlakas neiros",
    detail: "Fully ready, dressed b'kavod, before candle lighting.",
    unitLabel: "times ready before candle lighting",
    unitValue: 1,
    audience: "adult",
    sortOrder: 7,
  },
  {
    title: "Wash for Seudah Shlishis",
    detail: "Make Seudah Shlishis a proper seudah with hamotzi.",
    unitLabel: "seudos shlishis with hamotzi",
    unitValue: 1,
    audience: "adult",
    sortOrder: 8,
  },
  {
    title: "Say 3 perakim of Tehillim by candle lighting",
    detail: "Start Shabbos with Tehillim as the candles are lit.",
    unitLabel: "perakim of Tehillim said",
    unitValue: 3,
    audience: "adult",
    sortOrder: 9,
  },
  {
    title: "Call someone who'd appreciate it before Shabbos",
    detail: "A parent, a grandparent, someone alone — a pre-Shabbos hello.",
    unitLabel: "pre-Shabbos calls made",
    unitValue: 1,
    audience: "adult",
    sortOrder: 10,
  },
  {
    title: "Wear bigdei Shabbos all of Shabbos",
    detail: "Stay in your Shabbos best from candle lighting to havdalah.",
    unitLabel: "Shabbosos in full bigdei Shabbos",
    unitValue: 1,
    audience: "adult",
    sortOrder: 11,
  },

  // ---- Kids (grades 5–8) ----
  {
    title: "Spend 15 minutes helping for Shabbos",
    detail: "Set the table, help in the kitchen — 15 minutes of kavod Shabbos.",
    unitLabel: "minutes kids helped for Shabbos",
    unitValue: 15,
    audience: "kid",
    sortOrder: 20,
  },
  {
    title: "Sing zemiros at the table",
    detail: "Bring the niggunim — lead or join the zemiros at the seudah.",
    unitLabel: "tables singing zemiros",
    unitValue: 1,
    audience: "kid",
    sortOrder: 21,
  },
  {
    title: "Say a dvar Torah at the table",
    detail: "Share something you learned this week at the seudah.",
    unitLabel: "divrei Torah shared",
    unitValue: 1,
    audience: "kid",
    sortOrder: 22,
  },
  {
    title: "Come and stay in shul for Kabbalas Shabbos",
    detail: "Be there from Lecha Dodi through the end.",
    unitLabel: "Kabbalas Shabbos davened in shul",
    unitValue: 1,
    audience: "kid",
    sortOrder: 23,
  },
];

async function main() {
  const count = await prisma.suggestion.count();
  if (count === 0) {
    for (const s of suggestions) {
      await prisma.suggestion.create({ data: s });
    }
    console.log(`Seeded ${suggestions.length} suggestions`);
  } else {
    console.log(`Suggestions already present (${count}), skipping`);
  }

  await prisma.campaign.upsert({
    where: { id: "campaign" },
    update: {},
    create: {
      id: "campaign",
      name: "The Elul Shabbos Project",
      // 1 Elul 5786 — Friday, August 14, 2026. Editable in admin.
      startDate: new Date("2026-08-09T00:00:00-07:00"), // Sunday before the first Shabbos of Elul
      weeks: 4,
      signupDeadline: new Date("2026-08-14T19:00:00-07:00"),
      pledgePerSignup: 5,
      pledgePerCheckin: 1,
      charityName: "Tomchei Shabbos",
    },
  });
  console.log("Campaign config ready");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
