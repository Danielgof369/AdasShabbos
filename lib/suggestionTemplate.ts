/**
 * The default commitment list copied into every newly created shul.
 * Each shul's admin can then edit, hide, or extend their own copy freely.
 * categories: "adult" | "child" | "both".
 */
export const SUGGESTION_TEMPLATE = [
  { title: "Learn Hilchos Shabbos at the table", detail: "A few minutes of practical halacha at the seudah.", unitLabel: "tables learning Hilchos Shabbos", unitValue: 1, categories: "adult", sortOrder: 1, active: true },
  { title: "Prepare and say a dvar Torah at the table", detail: "Prepare something on the parsha to share at the seudah.", unitLabel: "divrei Torah shared", unitValue: 1, categories: "both", sortOrder: 2, active: true },
  { title: "Keep your phone off for the first 30 minutes after Shabbos", detail: "Don't rush back into the week — let Shabbos linger before the phone goes on.", unitLabel: "minutes added to Shabbos", unitValue: 30, categories: "adult", sortOrder: 3, active: true },
  { title: "Come 20 minutes early Shabbos morning to learn or join a shiur", detail: "Learn on your own or join a shiur before davening.", unitLabel: "minutes of extra learning", unitValue: 20, categories: "both", sortOrder: 4, active: true },
  { title: "Eat a proper Melava Malka", detail: "Escort the Shabbos Queen out properly on Motzei Shabbos.", unitLabel: "Melava Malkas eaten", unitValue: 1, categories: "adult", sortOrder: 5, active: true },
  { title: "Set the Shabbos table Thursday night", detail: "Walk into Friday with the table already glowing.", unitLabel: "tables set early", unitValue: 1, categories: "adult", sortOrder: 6, active: true },
  { title: "Be fully dressed in bigdei Shabbos by zman hadlakas neiros", detail: "Fully ready, dressed b'kavod, by the zman of candle lighting.", unitLabel: "times ready before candle lighting", unitValue: 1, categories: "both", sortOrder: 7, active: true },
  { title: "Wash for Seudah Shlishis", detail: "Make Seudah Shlishis a proper seudah with hamotzi.", unitLabel: "seudos shlishis with hamotzi", unitValue: 1, categories: "adult", sortOrder: 8, active: true },
  { title: "Say 3 perakim of Tehillim by candle lighting", detail: "Start Shabbos with Tehillim as the candles are lit.", unitLabel: "perakim of Tehillim said", unitValue: 3, categories: "both", sortOrder: 9, active: true },
  { title: "Call someone who'd appreciate it before Shabbos", detail: "A parent, a grandparent, someone alone — a pre-Shabbos hello.", unitLabel: "pre-Shabbos calls made", unitValue: 1, categories: "adult", sortOrder: 10, active: true },
  { title: "Wear bigdei Shabbos outside the house, all of Shabbos", detail: "Your Shabbos best whenever you're out, from candle lighting to havdalah.", unitLabel: "Shabbosos in full bigdei Shabbos", unitValue: 1, categories: "both", sortOrder: 11, active: true },
  { title: "Spend 15 minutes helping prepare for Shabbos", detail: "Set the table, help in the kitchen — 15 minutes of kavod Shabbos.", unitLabel: "minutes children helped for Shabbos", unitValue: 15, categories: "child", sortOrder: 12, active: true },
  { title: "Sing zemiros at the table", detail: "Bring the niggunim — lead or join the zemiros at the seudah.", unitLabel: "tables singing zemiros", unitValue: 1, categories: "child", sortOrder: 13, active: true },
  { title: "Children: come to shul and stay through Kabbalas Shabbos", detail: "Be there from Lecha Dodi through the end.", unitLabel: "Kabbalas Shabbos davened in shul", unitValue: 1, categories: "child", sortOrder: 14, active: true },
  // Extra ideas, hidden until the shul's admin switches them on:
  { title: "Put your phone away 30 minutes before Shabbos", detail: "Ease into Shabbos without the last-minute scramble.", unitLabel: "minutes added to Shabbos", unitValue: 30, categories: "adult", sortOrder: 15, active: false },
  { title: "Do Shnayim Mikra on the parsha this week", detail: "Twice mikra, once targum, before Shabbos is out.", unitLabel: "parshiyos completed", unitValue: 1, categories: "adult", sortOrder: 16, active: false },
  { title: "Be in shul before Lecha Dodi on Friday night", detail: "Greet the Shabbos Queen from the first pasuk.", unitLabel: "on-time Kabbalas Shabbos arrivals", unitValue: 1, categories: "both", sortOrder: 17, active: false },
  { title: "No talking during davening and leining", detail: "The whole Shabbos, from start to finish.", unitLabel: "quiet davenings", unitValue: 1, categories: "both", sortOrder: 18, active: false },
  { title: "Bentch from a bentcher at every Shabbos seudah", detail: "Word by word, from the page.", unitLabel: "seudos bentched from a bentcher", unitValue: 3, categories: "both", sortOrder: 19, active: false },
  { title: "Invite a guest to a Shabbos meal", detail: "Share your table with someone new.", unitLabel: "guests hosted", unitValue: 1, categories: "adult", sortOrder: 20, active: false },
  { title: "Ask each of your kids a parsha question at the table", detail: "Turn the seudah into a conversation.", unitLabel: "parsha conversations", unitValue: 1, categories: "adult", sortOrder: 21, active: false },
  { title: "Stay at the table until bentching at every seudah", detail: "Be part of the whole seudah, start to finish.", unitLabel: "full seudos at the table", unitValue: 1, categories: "child", sortOrder: 22, active: false },
  { title: "Clear the table after each seudah", detail: "A simple, real way to give kavod to Shabbos.", unitLabel: "tables cleared", unitValue: 1, categories: "child", sortOrder: 23, active: false },
  { title: "Come to Seudah Shlishis in shul", detail: "Finish Shabbos together with the shul.", unitLabel: "seudos shlishis in shul", unitValue: 1, categories: "both", sortOrder: 24, active: false },
];
