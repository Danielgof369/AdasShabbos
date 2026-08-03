import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PLACEHOLDER suggestions — replace with the real list from the campaign
// organizers (each needs a unitLabel/unitValue for the homepage highlight reel).
const suggestions = [
  {
    title: "Light candles 10 minutes early",
    detail: "Bring Shabbos in a little sooner and start with calm.",
    unitLabel: "minutes added to Shabbos",
    unitValue: 10,
    kidFriendly: false,
    sortOrder: 1,
  },
  {
    title: "Keep Shabbos 15 minutes longer",
    detail: "Wait a little after zman before making havdalah.",
    unitLabel: "minutes added to Shabbos",
    unitValue: 15,
    kidFriendly: false,
    sortOrder: 2,
  },
  {
    title: "Set the Shabbos table",
    detail: "Make the table beautiful lichvod Shabbos — a great one for kids.",
    unitLabel: "tables set",
    unitValue: 1,
    kidFriendly: true,
    sortOrder: 3,
  },
  {
    title: "Bake challah",
    detail: "Homemade challah for the Shabbos seudah.",
    unitLabel: "challos baked",
    unitValue: 1,
    kidFriendly: true,
    sortOrder: 4,
  },
  {
    title: "Put your phone away an hour before candle lighting",
    detail: "Ease into Shabbos without the last-minute scramble.",
    unitLabel: "minutes added to Shabbos",
    unitValue: 60,
    kidFriendly: false,
    sortOrder: 5,
  },
  {
    title: "Prepare something on the parsha to share",
    detail: "A thought, question, or dvar Torah for the table.",
    unitLabel: "divrei Torah shared",
    unitValue: 1,
    kidFriendly: true,
    sortOrder: 6,
  },
  {
    title: "Sing zemiros at the seudah",
    detail: "Add a niggun or zemer to your Shabbos table.",
    unitLabel: "tables singing zemiros",
    unitValue: 1,
    kidFriendly: true,
    sortOrder: 7,
  },
  {
    title: "Invite a guest for a Shabbos meal",
    detail: "Share your table with someone new.",
    unitLabel: "guests hosted",
    unitValue: 1,
    kidFriendly: false,
    sortOrder: 8,
  },
  {
    title: "Help clear the table after the seudah",
    detail: "A simple way for kids to take part in kavod Shabbos.",
    unitLabel: "tables cleared",
    unitValue: 1,
    kidFriendly: true,
    sortOrder: 9,
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
