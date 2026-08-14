import { prisma } from "@/lib/db";
import {
  getCampaign,
  activeWeek,
  shabbosOfWeek,
  formatShabbosDate,
} from "@/lib/campaign";
import { lastShabbosWeek, nextShabbosWeek } from "@/lib/household";
import { memberCategory } from "@/lib/categories";
import { getCampaignStats } from "@/lib/stats";
import { isAdmin } from "@/lib/adminAuth";
import { goalTitle } from "@/lib/household";
import {
  loginAction,
  logoutAction,
  saveCampaignAction,
  saveSuggestionAction,
  deleteSuggestionAction,
  sendThursdayAction,
  sendCheckinAction,
} from "./actions";

export const dynamic = "force-dynamic";

function laDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

const inputCls =
  "w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm outline-none focus:border-gold";
const btnCls =
  "bg-navy text-cream rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-soft transition-colors";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="font-display text-2xl text-navy mb-4">Admin</h1>
        <form action={loginAction} className="space-y-3">
          <input
            type="password"
            name="password"
            placeholder="Admin password"
            className={inputCls}
          />
          <button type="submit" className={btnCls}>
            Log in
          </button>
        </form>
      </div>
    );
  }

  const campaign = await getCampaign();
  const week = activeWeek(campaign);
  const stats = await getCampaignStats(week);
  const suggestions = await prisma.suggestion.findMany({ orderBy: { sortOrder: "asc" } });
  const households = await prisma.household.findMany({
    include: {
      members: { include: { goals: { include: { suggestion: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const messageCounts = await prisma.messageLog.groupBy({
    by: ["kind", "week"],
    _count: { _all: true },
    orderBy: [{ week: "asc" }],
  });

  const upWeek = Math.min(nextShabbosWeek(campaign), campaign.weeks);
  const doneWeek = lastShabbosWeek(campaign);
  const upShabbos = formatShabbosDate(shabbosOfWeek(campaign, upWeek));
  const preShabbosBlast = [
    `🕯️ *The Elul Shabbos Project — Week ${upWeek} of ${campaign.weeks}*`,
    ``,
    `Shabbos ${upShabbos} is coming! Whatever you signed up for this week — this is your Shabbos to do it. 💪`,
    ``,
    `Not signed up yet? It takes 30 seconds, the whole family can join, and every signup sends $5 to ${campaign.charityName}:`,
    `https://shabboswithadas.com`,
  ].join("\n");
  const checkinBlast = [
    `✨ *Gut voch, Adas Torah!*`,
    ``,
    doneWeek >= 1
      ? `How did week ${doneWeek} go? Take 10 seconds to check in — every check-in sends another $1 to ${campaign.charityName} and moves the whole shul's numbers:`
      : `The campaign is about to begin — sign up now and pick your first commitment:`,
    `https://shabboswithadas.com/find`,
    ``,
    `Then pick your commitment for next Shabbos while you're there. 🔥`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-navy">Campaign admin</h1>
        <form action={logoutAction}>
          <button className="text-sm text-ink-soft underline hover:text-navy">
            Log out
          </button>
        </form>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          ["Households", stats.households],
          ["People", stats.members],
          ["Children", stats.kids],
          ["Check-ins", stats.checkins],
          [`$ to ${stats.charityName}`, `$${stats.pledgeTotal}`],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="bg-white rounded-xl border border-parchment px-4 py-4 text-center"
          >
            <div className="font-display text-2xl text-navy">{value}</div>
            <div className="text-xs text-ink-soft mt-1">{label}</div>
          </div>
        ))}
      </section>

      {/* Reminders */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-3">Reminders</h2>
        <p className="text-sm text-ink-soft mb-4">
          Crons run automatically (Thursday &amp; Sunday 9am PT). These buttons
          trigger the same runs by hand — already-sent households are skipped,
          so it&rsquo;s safe to press twice.
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          <form action={sendThursdayAction}>
            <button className={btnCls}>Send Thursday reminder now</button>
          </form>
          <form action={sendCheckinAction}>
            <button className={btnCls}>Send check-in reminder now</button>
          </form>
          <a href="/api/admin/export" className={btnCls + " inline-block"}>
            Export CSV
          </a>
        </div>
        {messageCounts.length > 0 && (
          <p className="text-xs text-ink-soft">
            Sent so far:{" "}
            {messageCounts
              .map((m) => `${m.kind} w${m.week}: ${m._count._all}`)
              .join(" · ")}
          </p>
        )}
      </section>

      {/* WhatsApp blast texts */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">
          WhatsApp / announcement blasts
        </h2>
        <p className="text-sm text-ink-soft mb-4">
          Ready-to-paste messages for the shul WhatsApp group — long-press to
          select and copy. They update automatically each week.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-navy mb-1">
              Before Shabbos (send Thursday/Friday):
            </p>
            <textarea
              readOnly
              rows={6}
              className="w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm"
              defaultValue={preShabbosBlast}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-navy mb-1">
              After Shabbos (send Motzei Shabbos/Sunday):
            </p>
            <textarea
              readOnly
              rows={6}
              className="w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm"
              defaultValue={checkinBlast}
            />
          </div>
        </div>
      </section>

      {/* Households */}
      <section className="bg-white rounded-xl border border-parchment p-5 overflow-x-auto">
        <h2 className="font-semibold text-navy mb-3">
          Signups ({households.length} households)
        </h2>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-ink-soft border-b border-parchment">
              <th className="py-2 pr-3">Contact</th>
              <th className="py-2 pr-3">People</th>
              <th className="py-2 pr-3">This week (w{week})</th>
              <th className="py-2 pr-3">Weeks</th>
              <th className="py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {households.map((h) => (
              <tr key={h.id} className="border-b border-parchment/60 align-top">
                <td className="py-2 pr-3 whitespace-nowrap">
                  {h.familyName && <div className="font-medium">{h.familyName}</div>}
                  {h.phone && <div>{h.phone}</div>}
                  {h.email && <div className="text-ink-soft">{h.email}</div>}
                  {h.email2 && <div className="text-ink-soft">{h.email2}</div>}
                  {h.email3 && <div className="text-ink-soft">{h.email3}</div>}
                </td>
                <td className="py-2 pr-3">
                  {h.members.map((m) => {
                    const cat = memberCategory(m);
                    const icon = { man: "👨", woman: "👩", boy: "👦", girl: "👧" }[cat];
                    return (
                      <div key={m.id}>
                        {m.name} {icon}
                      </div>
                    );
                  })}
                </td>
                <td className="py-2 pr-3">
                  {h.members.map((m) => {
                    const g = m.goals.find((g) => g.week === week);
                    return (
                      <div key={m.id} className="text-ink-soft">
                        {g ? goalTitle(g) : <em>not set</em>}
                        {g?.checkedInAt ? " ✓" : ""}
                      </div>
                    );
                  })}
                </td>
                <td className="py-2 pr-3">
                  {h.members.map((m) => (
                    <div key={m.id} className="font-mono text-xs tracking-wider">
                      {Array.from({ length: campaign.weeks }, (_, i) => {
                        const g = m.goals.find((g) => g.week === i + 1);
                        return g?.checkedInAt ? "✓" : g ? "·" : "–";
                      }).join(" ")}
                    </div>
                  ))}
                </td>
                <td className="py-2">
                  <a
                    href={`/c/${h.token}`}
                    className="text-navy underline underline-offset-2"
                  >
                    open
                  </a>
                </td>
              </tr>
            ))}
            {households.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink-soft">
                  No signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Suggestions */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">Commitment options</h2>
        <p className="text-sm text-ink-soft mb-4">
          The unit label + value drive the homepage highlight reel (e.g. unit
          &ldquo;minutes added to Shabbos&rdquo; × 10 per check-in).
        </p>
        <div className="space-y-3">
          {suggestions.map((s) => (
            <details key={s.id} className="rounded-lg border border-parchment">
              <summary className="cursor-pointer px-4 py-2.5 text-sm flex items-center justify-between">
                <span>
                  {s.title}
                  {!s.active && (
                    <span className="ml-2 text-xs text-red-600">(hidden)</span>
                  )}
                </span>
                <span className="text-xs text-ink-soft">
                  {s.unitValue} × {s.unitLabel}
                </span>
              </summary>
              <form
                action={saveSuggestionAction}
                className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <input type="hidden" name="id" value={s.id} />
                <label className="text-xs text-ink-soft sm:col-span-2">
                  Title
                  <input name="title" defaultValue={s.title} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft sm:col-span-2">
                  Detail
                  <input name="detail" defaultValue={s.detail ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Unit label
                  <input name="unitLabel" defaultValue={s.unitLabel} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Unit value
                  <input
                    name="unitValue"
                    type="number"
                    defaultValue={s.unitValue}
                    className={inputCls}
                  />
                </label>
                <label className="text-xs text-ink-soft">
                  Sort order
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={s.sortOrder}
                    className={inputCls}
                  />
                </label>
                <div className="text-xs text-ink-soft sm:col-span-2">
                  Shown to
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-ink">
                    {(["adult", "child"] as const).map((c) => (
                      <label key={c} className="flex items-center gap-1.5 capitalize">
                        <input
                          type="checkbox"
                          name={`cat_${c}`}
                          defaultChecked={s.categories.includes(c) || s.categories.includes("both") || ["man","woman","boy","girl"].some((x) => s.categories.includes(x) && ((c === "adult" && (x === "man" || x === "woman")) || (c === "child" && (x === "boy" || x === "girl"))))}
                        />
                        {c}
                      </label>
                    ))}
                    <label className="flex items-center gap-1.5 ml-4">
                      <input type="checkbox" name="active" defaultChecked={s.active} />
                      Active (visible on the site)
                    </label>
                  </div>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button className={btnCls}>Save</button>
                  <button
                    formAction={deleteSuggestionAction}
                    className="text-sm text-red-700 underline"
                  >
                    Delete / hide
                  </button>
                </div>
              </form>
            </details>
          ))}
        </div>

        <details className="mt-4 rounded-lg border-2 border-dashed border-gold-soft">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-navy">
            + Add a new option
          </summary>
          <form
            action={saveSuggestionAction}
            className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <label className="text-xs text-ink-soft sm:col-span-2">
              Title
              <input name="title" placeholder="e.g. Bake challah" className={inputCls} />
            </label>
            <label className="text-xs text-ink-soft sm:col-span-2">
              Detail
              <input name="detail" className={inputCls} />
            </label>
            <label className="text-xs text-ink-soft">
              Unit label
              <input name="unitLabel" placeholder="challos baked" className={inputCls} />
            </label>
            <label className="text-xs text-ink-soft">
              Unit value
              <input name="unitValue" type="number" defaultValue={1} className={inputCls} />
            </label>
            <label className="text-xs text-ink-soft">
              Sort order
              <input name="sortOrder" type="number" defaultValue={99} className={inputCls} />
            </label>
            <div className="text-xs text-ink-soft sm:col-span-2">
              Shown to
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-ink">
                {(["adult", "child"] as const).map((c) => (
                  <label key={c} className="flex items-center gap-1.5 capitalize">
                    <input type="checkbox" name={`cat_${c}`} defaultChecked />
                    {c}
                  </label>
                ))}
                <label className="flex items-center gap-1.5 ml-4">
                  <input type="checkbox" name="active" defaultChecked />
                  Active (visible on the site)
                </label>
              </div>
            </div>
            <div className="sm:col-span-2">
              <button className={btnCls}>Add option</button>
            </div>
          </form>
        </details>
      </section>

      {/* Campaign settings */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-3">Campaign settings</h2>
        <form
          action={saveCampaignAction}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl"
        >
          <label className="text-xs text-ink-soft sm:col-span-2">
            Campaign name
            <input name="name" defaultValue={campaign.name} className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Week 1 starts (Sunday)
            <input
              name="startDate"
              type="date"
              defaultValue={laDateInput(campaign.startDate)}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-ink-soft">
            Number of weeks
            <input
              name="weeks"
              type="number"
              defaultValue={campaign.weeks}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-ink-soft">
            Signup deadline (for the ${campaign.pledgePerSignup} pledge)
            <input
              name="signupDeadline"
              type="date"
              defaultValue={laDateInput(campaign.signupDeadline)}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-ink-soft">
            Charity name
            <input name="charityName" defaultValue={campaign.charityName} className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            $ per signup
            <input
              name="pledgePerSignup"
              type="number"
              defaultValue={campaign.pledgePerSignup}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-ink-soft">
            $ per check-in
            <input
              name="pledgePerCheckin"
              type="number"
              defaultValue={campaign.pledgePerCheckin}
              className={inputCls}
            />
          </label>
          <div className="sm:col-span-2">
            <button className={btnCls}>Save settings</button>
          </div>
        </form>
      </section>
    </div>
  );
}
