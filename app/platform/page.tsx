import { prisma } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/adminAuth";
import { shulBaseUrl, ROOT_DOMAIN } from "@/lib/tenant";
import {
  platformLoginAction,
  platformLogoutAction,
  createShulAction,
  updateShulAction,
  approveShulAction,
  saveSeasonAction,
  createShulFromRequestsAction,
  moveRequestsToShulAction,
  resendWelcomeAction,
} from "./actions";
import { getIndividualsShul } from "@/lib/individuals";
import { getSeason } from "@/lib/season";
import { emailFrom } from "@/lib/messaging";
import { TIMEZONES } from "@/lib/platform";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm outline-none focus:border-gold";
const btnCls =
  "bg-navy text-cream rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-soft transition-colors";

export default async function PlatformPage() {
  if (!(await isPlatformAdmin())) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="font-display text-2xl text-navy mb-1">Platform admin</h1>
        <p className="text-sm text-ink-soft mb-4">
          Creates and manages the shuls on Kabalos Shabbos.
        </p>
        <form action={platformLoginAction} className="space-y-3">
          <input
            type="password"
            name="password"
            placeholder="Platform password"
            className={inputCls}
          />
          <button type="submit" className={btnCls}>
            Log in
          </button>
        </form>
      </div>
    );
  }

  const season = await getSeason();
  const individuals = await getIndividualsShul();
  const requests = await prisma.household.findMany({
    where: { shulId: individuals.id, shulNote: { not: null } },
    select: { shulNote: true, familyName: true },
  });
  const requestGroups = [...requests.reduce((m, h) => {
    const key = (h.shulNote ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const g = m.get(key) ?? { note: h.shulNote ?? "", families: [] as string[] };
    g.families.push(h.familyName ?? "?");
    return m.set(key, g);
  }, new Map<string, { note: string; families: string[] }>()).values()].sort((a, b) => b.families.length - a.families.length);
  const soloCount = await prisma.household.count({ where: { shulId: individuals.id } });

  // Email delivery: recent signups and whether their welcome went out.
  const recent = await prisma.household.findMany({
    where: { shulId: individuals.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, familyName: true, email: true, city: true, createdAt: true, _count: { select: { members: true } } },
  });
  const welcomeLogs = await prisma.messageLog.findMany({
    where: { kind: "welcome", householdId: { in: recent.map((h) => h.id) } },
    orderBy: { sentAt: "desc" },
    select: { householdId: true, channel: true, sentAt: true },
  });
  const welcomeBy = new Map<string, { channel: string; sentAt: Date }>();
  for (const l of welcomeLogs) if (!welcomeBy.has(l.householdId)) welcomeBy.set(l.householdId, l);
  const missingWelcome = recent.filter((h) => !welcomeBy.has(h.id));
  const lastCron = await prisma.messageLog.findFirst({
    where: { kind: { in: ["friday_reminder", "checkin_reminder", "checkin_drip"] } },
    orderBy: { sentAt: "desc" },
    select: { kind: true, sentAt: true },
  });
  const resendConfigured = !!process.env.RESEND_API_KEY;
  const fmt = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: season.timezone });
  const shuls = await prisma.shul.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { households: true, suggestions: true } },
    },
  });
  const memberCounts = new Map(
    await Promise.all(
      shuls.map(
        async (s) =>
          [s.id, await prisma.member.count({ where: { household: { shulId: s.id } } })] as const
      )
    )
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-navy">Platform admin</h1>
        <form action={platformLogoutAction}>
          <button className="text-sm text-ink-soft underline hover:text-navy">Log out</button>
        </form>
      </div>

      {/* National season */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">National season</h2>
        <p className="text-sm text-ink-soft mb-4">
          The label and Shabbos dates every shul added from the national signup
          runs on ({shuls.filter((s) => !s.hasSite).length} national{" "}
          {shuls.filter((s) => !s.hasSite).length === 1 ? "shul" : "shuls"} right now). Shuls with their own
          site keep their own dates. Families who join mid-season get the
          remaining Shabbosos.
        </p>
        <form action={saveSeasonAction} className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
          <label className="text-xs text-ink-soft">
            Season label
            <input name="label" defaultValue={season.label} className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft sm:col-span-2">
            Shabbos dates (YYYY-MM-DD, comma or newline separated, Saturdays)
            <textarea name="dates" rows={2} defaultValue={season.dates.join(", ")} className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Timezone for date labels
            <select name="timezone" defaultValue={season.timezone} className={inputCls}>
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink self-end pb-2 sm:col-span-2">
            <input type="checkbox" name="applyToNational" defaultChecked />
            Also update every existing national shul to these dates
          </label>
          <div className="sm:col-span-3">
            <button className={btnCls}>Save season</button>
          </div>
        </form>
      </section>

      {/* Email delivery */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">Email delivery</h2>
        <p className="text-sm text-ink-soft mb-4">
          Sending as <span className="font-mono text-navy">{emailFrom()}</span>
          {" · "}
          {resendConfigured ? "Resend connected" : <span className="text-red-700 font-medium">RESEND_API_KEY missing — nothing is being emailed</span>}
          {" · "}
          {lastCron ? `last reminder run: ${lastCron.kind.replace(/_/g, " ")} at ${fmt(lastCron.sentAt)}` : "no reminder run yet"}
        </p>
        {missingWelcome.length > 0 && (
          <p className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 mb-4">
            {missingWelcome.length} recent {missingWelcome.length === 1 ? "signup has" : "signups have"} no welcome email on record. Use &ldquo;Send welcome&rdquo; below.
          </p>
        )}
        {recent.length === 0 ? (
          <p className="text-sm text-ink-soft italic">No signups yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-soft text-left">
                <tr><th className="py-1 pr-3">Signed up</th><th className="py-1 pr-3">Family</th><th className="py-1 pr-3">Email</th><th className="py-1 pr-3">Welcome email</th><th className="py-1"></th></tr>
              </thead>
              <tbody>
                {recent.map((h) => {
                  const w = welcomeBy.get(h.id);
                  return (
                    <tr key={h.id} className="border-t border-parchment">
                      <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">{fmt(h.createdAt)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap"><span className="font-medium text-navy">{h.familyName ?? "?"}</span> <span className="text-ink-soft">· {h._count.members} · {h.city ?? "—"}</span></td>
                      <td className="py-2 pr-3 whitespace-nowrap">{h.email ?? <span className="text-ink-soft italic">no email</span>}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {w ? <span className="text-green-800">✓ {w.channel} · {fmt(w.sentAt)}</span> : <span className="text-red-700 font-medium">not sent</span>}
                      </td>
                      <td className="py-2 text-right">
                        {h.email && (
                          <form action={resendWelcomeAction}>
                            <input type="hidden" name="id" value={h.id} />
                            <button className="text-xs underline text-navy hover:text-gold">{w ? "Resend welcome" : "Send welcome"}</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Shul requests from individual signups */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">
          Individual signups ({soloCount}) &middot; shul requests ({requestGroups.length})
        </h2>
        <p className="text-sm text-ink-soft mb-4">
          Nobody can add a shul from the public site. People who sign up on
          their own tell us their shul; create it here (or pick an existing
          one) and those families move onto its page automatically.
        </p>
        {requestGroups.length === 0 ? (
          <p className="text-sm text-ink-soft italic">No shul requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requestGroups.map((g) => (
              <div key={g.note} className="rounded-lg border border-parchment bg-cream/50 p-4">
                <p className="font-medium text-navy">&ldquo;{g.note}&rdquo; <span className="text-ink-soft font-normal text-sm">· {g.families.length} {g.families.length === 1 ? "family" : "families"}: {g.families.join(", ")}</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <form action={createShulFromRequestsAction} className="flex flex-wrap gap-2 items-end">
                    <input type="hidden" name="note" value={g.note} />
                    <label className="text-xs text-ink-soft flex-1 min-w-40">Create shul<input name="name" defaultValue={g.note} className={inputCls} /></label>
                    <label className="text-xs text-ink-soft w-28">City<input name="city" className={inputCls} /></label>
                    <label className="text-xs text-ink-soft w-16">State<input name="state" className={inputCls} /></label>
                    <button className={btnCls}>Create &amp; move</button>
                  </form>
                  <form action={moveRequestsToShulAction} className="flex flex-wrap gap-2 items-end">
                    <input type="hidden" name="note" value={g.note} />
                    <label className="text-xs text-ink-soft flex-1 min-w-40">Or move into an existing shul
                      <select name="shulId" className={inputCls}>
                        {shuls.filter((s) => s.listed && s.slug !== "individuals").map((s) => (
                          <option key={s.id} value={s.id}>{s.name} · {s.city}</option>
                        ))}
                      </select>
                    </label>
                    <button className={btnCls}>Move</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Awaiting approval */}
      {shuls.some((s) => !s.approved) && (
        <section className="bg-gold-pale/60 rounded-xl border border-gold/50 p-5">
          <h2 className="font-semibold text-navy mb-1">
            Awaiting approval ({shuls.filter((s) => !s.approved).length})
          </h2>
          <p className="text-sm text-ink-soft mb-4">
            Signed up through /start. Their site shows &ldquo;almost ready&rdquo; to
            visitors and their admin page already works. Approving opens the
            site, lists it in the directory, and emails the organizer.
          </p>
          <div className="space-y-2">
            {shuls.filter((s) => !s.approved).map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border border-parchment px-4 py-3 text-sm">
                <span>
                  <span className="font-medium text-navy">{s.name}</span>
                  <span className="text-ink-soft"> · {s.city}{s.state ? `, ${s.state}` : ""} · {s.contactName} &lt;{s.contactEmail}&gt; · {s.shabbosDates.split(",").length} weeks from {s.shabbosDates.split(",")[0]}</span>
                  {" "}
                  <a className="underline text-ink-soft" href={shulBaseUrl(s) + "/admin"} target="_blank" rel="noreferrer">preview</a>
                </span>
                <form action={approveShulAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className={btnCls}>Approve &amp; open</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shul list */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-3">
          Shuls ({shuls.length})
        </h2>
        <div className="space-y-3">
          {shuls.map((s) => (
            <details key={s.id} className="rounded-lg border border-parchment">
              <summary className="cursor-pointer px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium text-navy">{s.name}</span>
                  <span className="text-ink-soft"> · {s.city}{s.state ? `, ${s.state}` : ""}</span>
                  {s.contactEmail && (
                    <span className="text-ink-soft text-xs"> · {s.contactName ?? ""} &lt;{s.contactEmail}&gt;</span>
                  )}
                  {!s.approved && <span className="ml-2 text-xs text-gold">(awaiting approval)</span>}
                  {!s.active && <span className="ml-2 text-xs text-red-600">(inactive)</span>}
                  {!s.listed && <span className="ml-2 text-xs text-ink-soft">(unlisted)</span>}
                </span>
                <span className="text-xs text-ink-soft">
                  {s._count.households} families · {memberCounts.get(s.id) ?? 0} people ·{" "}
                  <a
                    className="underline"
                    href={shulBaseUrl(s)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.customDomain ?? `${s.slug} ↗`}
                  </a>
                </span>
              </summary>
              <form
                action={updateShulAction}
                className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <input type="hidden" name="id" value={s.id} />
                <label className="text-xs text-ink-soft">
                  Name
                  <input name="name" defaultValue={s.name} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  City / state
                  <span className="flex gap-2">
                    <input name="city" defaultValue={s.city} className={inputCls} />
                    <input name="state" defaultValue={s.state ?? ""} placeholder="CA" className={inputCls + " w-20"} />
                  </span>
                </label>
                <label className="text-xs text-ink-soft">
                  Organizer name
                  <input name="contactName" defaultValue={s.contactName ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Organizer email
                  <input name="contactEmail" defaultValue={s.contactEmail ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft sm:col-span-2">
                  Partner community (optional)
                  <input name="partnerName" defaultValue={s.partnerName ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft sm:col-span-2">
                  Shabbos dates (YYYY-MM-DD, comma-separated)
                  <input name="shabbosDates" defaultValue={s.shabbosDates} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  UTC offset
                  <input name="tzOffset" defaultValue={s.tzOffset} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Timezone (IANA)
                  <input name="timezone" defaultValue={s.timezone} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft sm:col-span-2">
                  Custom domain (optional — e.g. shabboswithadas.com; also add it in Vercel)
                  <input name="customDomain" defaultValue={s.customDomain ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Shul logo (navy bg) — /path or URL
                  <input name="logoDark" defaultValue={s.logoDark ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Shul logo (light bg)
                  <input name="logoLight" defaultValue={s.logoLight ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Partner logo (navy bg)
                  <input name="partnerLogoDark" defaultValue={s.partnerLogoDark ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Partner logo (light bg)
                  <input name="partnerLogoLight" defaultValue={s.partnerLogoLight ?? ""} className={inputCls} />
                </label>
                <label className="text-xs text-ink-soft">
                  Reset shul admin password (8+ chars, blank = keep)
                  <input name="adminPassword" className={inputCls} />
                </label>
                <div className="flex items-center gap-5 text-sm text-ink self-end pb-1">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="active" defaultChecked={s.active} />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="listed" defaultChecked={s.listed} />
                    Listed in directory
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <button className={btnCls}>Save shul</button>
                </div>
              </form>
            </details>
          ))}
          {shuls.length === 0 && (
            <p className="text-sm text-ink-soft italic">No shuls yet — create the first below.</p>
          )}
        </div>
      </section>

      {/* Create shul */}
      <section className="bg-white rounded-xl border border-parchment p-5">
        <h2 className="font-semibold text-navy mb-1">+ Add a shul by hand</h2>
        <p className="text-sm text-ink-soft mb-4">
          Shuls normally sign themselves up at <code>/start</code>. This form does the
          same thing without the welcome email: creates their site at{" "}
          <code>slug.{ROOT_DOMAIN}</code>, loads the standard commitment list, and
          sets their admin password.
        </p>
        <form
          action={createShulAction}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl"
        >
          <label className="text-xs text-ink-soft">
            Slug (subdomain: lowercase letters/numbers)
            <input name="slug" placeholder="yishail" className={inputCls} required />
          </label>
          <label className="text-xs text-ink-soft">
            Shul name
            <input name="name" placeholder="Young Israel of Example" className={inputCls} required />
          </label>
          <label className="text-xs text-ink-soft">
            City / state
            <span className="flex gap-2">
              <input name="city" placeholder="Baltimore" className={inputCls} required />
              <input name="state" placeholder="MD" className={inputCls + " w-20"} />
            </span>
          </label>
          <label className="text-xs text-ink-soft">
            Organizer name
            <input name="contactName" className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Organizer email
            <input name="contactEmail" className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Season label
            <input name="seasonLabel" placeholder="Elul 5786" className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Partner community (optional)
            <input name="partnerName" className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft sm:col-span-2">
            Campaign Shabbos dates (YYYY-MM-DD, comma-separated)
            <input
              name="shabbosDates"
              placeholder="2026-08-22,2026-08-29,2026-09-05,2026-09-19"
              className={inputCls}
              required
            />
          </label>
          <label className="text-xs text-ink-soft">
            UTC offset during campaign
            <input name="tzOffset" placeholder="-04:00" className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Timezone (IANA)
            <input name="timezone" placeholder="America/New_York" className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Charity name
            <input name="charityName" placeholder="Tomchei Shabbos" className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            $ per family signup
            <input name="pledgePerSignup" type="number" defaultValue={5} className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Custom domain (optional)
            <input name="customDomain" className={inputCls} />
          </label>
          <label className="text-xs text-ink-soft">
            Their admin password (8+ characters)
            <input name="adminPassword" className={inputCls} required />
          </label>
          <div className="sm:col-span-2">
            <button className={btnCls}>Create shul</button>
          </div>
        </form>
      </section>
    </div>
  );
}
