import { prisma } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/adminAuth";
import { shulBaseUrl } from "@/lib/tenant";
import {
  platformLoginAction,
  platformLogoutAction,
  createShulAction,
  updateShulAction,
} from "./actions";

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
          Creates and manages the shuls running the Elul Shabbos Project.
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
                  <span className="text-ink-soft"> · {s.city}</span>
                  {!s.active && <span className="ml-2 text-xs text-red-600">(inactive)</span>}
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
                  City
                  <input name="city" defaultValue={s.city} className={inputCls} />
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
                <label className="flex items-center gap-2 text-sm text-ink self-end pb-1">
                  <input type="checkbox" name="active" defaultChecked={s.active} />
                  Active
                </label>
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
        <h2 className="font-semibold text-navy mb-1">+ Add a shul</h2>
        <p className="text-sm text-ink-soft mb-4">
          Creates their site at <code>slug.theelulshabbosproject.com</code>, loads
          the standard commitment list (their admin can edit it), and sets their
          admin password. Reminders and crons pick the new shul up automatically.
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
            City
            <input name="city" placeholder="Baltimore" className={inputCls} required />
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
