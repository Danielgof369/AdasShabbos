/**
 * The Kabalas Shabbos Initiative commitment list — in partnership with
 * Kedushas Shabbos — copied into every newly created shul. Three tiers:
 *   individual — one person takes it on (shown per person at signup)
 *   family     — the household together (adults pick it at signup)
 *   kehilla    — the shul as a whole (shown on the shul page; the shul's
 *                admin marks the ones the kehilla has taken on)
 * unitLabel/unitValue feed the live counters.
 */
type T = { title: string; detail: string; unitLabel: string; unitValue: number; categories: string; tier: "individual" | "family" | "kehilla"; sortOrder: number; active: boolean };
const t = (tier: T["tier"], categories: string, title: string, detail: string, unitLabel: string, unitValue = 1, active = true): Omit<T, "sortOrder"> =>
  ({ tier, categories, title, detail, unitLabel, unitValue, active });

export const SUGGESTION_TEMPLATE: T[] = [
  // ---- Individual ----
  t("individual", "adult", "Learn from a sefer on Kedushas Shabbos, 20 minutes a week", "A fixed 20-minute seder each week in a sefer on the kedushah of Shabbos.", "minutes learned about Shabbos", 20),
  t("individual", "adult", "Learn Hilchos Shabbos, 20 minutes a week", "One siman or one melachah at a time — a fixed seder, not a one-off.", "minutes of Hilchos Shabbos learned", 20),
  t("individual", "adult", "Set a weekly chavrusa in Hilchos Shabbos or Kedushas Shabbos", "A chavrusa keeps the seder happening week after week.", "chavrusa sessions held"),
  t("individual", "both", "Be in shul on time for Pesukei D'Zimrah", "Start Shabbos morning davening from the beginning.", "on-time Pesukei D'Zimrah arrivals"),
  t("individual", "both", "Daven Kabbalas Shabbos with extra focus", "Welcome Shabbos with real kavanah, from Lechu Neranena through Lecha Dodi.", "Kabbalas Shabbos davened with kavanah"),
  t("individual", "both", "Pause and concentrate on the words of “LaKeil Asher Shavas”", "Slow down for that one paragraph every Shabbos morning.", "LaKeil Asher Shavas said with kavanah"),
  t("individual", "both", "No talking during at least one complete tefillah on Shabbos", "Pick one — Kabbalas Shabbos, Shacharis, Mincha — and keep it fully quiet.", "tefillos without talking"),
  t("individual", "both", "Attend Mincha on Shabbos and Maariv on Motzaei Shabbos", "Bookend Shabbos in shul.", "Mincha & Maariv attended"),
  t("individual", "both", "Stay in Bigdei Shabbos the entire Shabbos", "From candle lighting to Havdalah, at home and out.", "Shabbosos in full bigdei Shabbos"),
  t("individual", "adult", "Buy or prepare one special item each week lichvod Shabbos", "A dish, a flower, a treat — something that exists only because it's Shabbos.", "special items lichvod Shabbos"),
  // Children (individual)
  t("individual", "child", "Spend 15 minutes helping prepare for Shabbos", "Set the table, help in the kitchen — 15 minutes of kavod Shabbos.", "minutes children helped for Shabbos", 15),
  t("individual", "child", "Sing zemiros at the table", "Bring the niggunim — lead or join the zemiros at the seudah.", "tables singing zemiros"),
  t("individual", "child", "Come to shul and stay through Kabbalas Shabbos", "Be there from Lecha Dodi through the end.", "Kabbalas Shabbos davened in shul"),
  t("individual", "child", "Clear the table after each seudah", "A simple, real way to give kavod to Shabbos.", "tables cleared"),
  // ---- Family ----
  t("family", "adult", "Learn two halachos together at a Shabbos seudah", "A few minutes of practical Hilchos Shabbos at the table, every week.", "halachos learned at the table", 2),
  t("family", "adult", "Sing at least one zemer at every seudah", "Warmth and simchah at the table — one zemer, every seudah.", "seudos with zemiros", 3),
  t("family", "adult", "Eat Melaveh Malkah together every week", "Escort the Shabbos Queen out properly on Motzaei Shabbos.", "Melaveh Malkahs eaten"),
  t("family", "adult", "Give every family member a role in preparing for Shabbos", "Everyone owns one piece of getting the home ready.", "families preparing together"),
  t("family", "adult", "Set the Shabbos table Thursday night", "Walk into Friday with the table already glowing.", "tables set Thursday night"),
  t("family", "adult", "Keep the seudah tables covered all Shabbos", "Tablecloths stay on from Friday night through Havdalah.", "tables kept covered"),
  t("family", "adult", "Set aside time on Shabbos to learn with the children", "A fixed slot, even ten minutes, every Shabbos.", "learning sessions with children"),
  t("family", "adult", "Share a halachah, story, or Shabbos thought at the seudah", "Turn the seudah into a conversation about Shabbos.", "Shabbos thoughts shared at the table"),
  // ---- Kehilla ----
  t("kehilla", "both", "A weekly vaad on a sefer that strengthens Kedushas Shabbos", "A standing group learning one sefer together.", "vaadim held", 1, false),
  t("kehilla", "both", "A regular Hilchos Shabbos shiur in shul", "Weekly, on the calendar, with a rav.", "shiurim given", 1, false),
  t("kehilla", "both", "On time for Pesukei D'Zimrah — as a kehilla", "The whole shul commits to a full Shacharis.", "kehilla commitments", 1, false),
  t("kehilla", "both", "Kabbalas Shabbos with greater focus and feeling — as a kehilla", "A kehilla-wide kabbolah on how we welcome Shabbos.", "kehilla commitments", 1, false),
  t("kehilla", "both", "A shared kabbolah: no talking during davening", "Accepted together, announced from the bimah.", "kehilla commitments", 1, false),
  t("kehilla", "both", "Focus together on the meaning of “LaKeil Asher Shavas”", "The rav explains it; the kehilla says it with kavanah.", "kehilla commitments", 1, false),
  t("kehilla", "both", "Stronger attendance at Mincha on Shabbos and Motzaei Shabbos Maariv", "Fill the room at both ends of Shabbos.", "kehilla commitments", 1, false),
  t("kehilla", "both", "A meaningful communal shalosh seudos", "Zemiros, a dvar Torah, and the whole shul at the table.", "kehilla commitments", 1, false),
  t("kehilla", "both", "Encourage Bigdei Shabbos the entire Shabbos", "A kehilla-wide standard for the whole day.", "kehilla commitments", 1, false),
].map((x, i) => ({ ...x, sortOrder: i + 1 }));

/** The original Adas Torah Elul list (kept for the Adas seed). */
export const ADAS_TEMPLATE = [
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
