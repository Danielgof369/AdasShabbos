import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { PLATFORM, TIERS } from "@/lib/platform";
import { SUGGESTION_TEMPLATE } from "@/lib/suggestionTemplate";
import type { NationalStats } from "@/lib/stats";
import ShulDirectory, { type DirectoryShul } from "@/components/national/ShulDirectory";

function partnerLogo(tone: "light" | "dark"): string | null {
  const file = tone === "dark" ? PLATFORM.partner.logoDark : PLATFORM.partner.logoLight;
  return fs.existsSync(path.join(process.cwd(), "public", file)) ? file : null;
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-white/10 rounded-xl border border-cream/15 px-4 py-5 text-center">
      <div className="font-display text-3xl sm:text-4xl text-gold-soft tabular-nums">{value}</div>
      <div className="text-cream/75 text-sm mt-1">{label}</div>
    </div>
  );
}

export default function NationalHome({ stats, shuls }: { stats: NationalStats; shuls: DirectoryShul[] }) {
  const live = stats.shuls > 0;
  const partnerDark = partnerLogo("dark");
  const examples = TIERS.map((t) => ({
    ...t,
    items: SUGGESTION_TEMPLATE.filter((s) => s.tier === t.key && s.categories !== "child").slice(0, 4),
  }));
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-cream relative overflow-hidden">
        <div className="glow-dot absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full" />
        <div className="glow-dot absolute -bottom-40 -left-20 h-96 w-96 rounded-full opacity-60" />
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20 relative">
          <div className="flex items-center gap-6 sm:gap-8 mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ksi-logo-white.png" alt={PLATFORM.name} className="h-32 sm:h-44 w-auto" />
            {partnerDark && (
              <>
                <span className="h-24 sm:h-32 w-px bg-cream/25" aria-hidden />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={partnerDark} alt={PLATFORM.partner.name} className="h-28 sm:h-40 w-auto" />
              </>
            )}
          </div>
          <p className="text-gold-soft font-display tracking-[0.25em] uppercase text-sm mb-5">
            {PLATFORM.season.label} &middot; in partnership with {PLATFORM.partner.name}
          </p>
          <h1 className="font-display text-4xl sm:text-6xl leading-[1.08] mb-6 max-w-3xl" style={{ textWrap: "balance" }}>
            One small thing for Shabbos.
            <br />
            Every week. <span className="text-gold-soft">Every shul.</span>
          </h1>
          <p className="text-cream/85 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
            Every man, woman and child takes on one extra way to honor Shabbos and holds it
            for the weeks leading into Rosh Hashanah. Sign up your family, name your shul,
            and watch your shul&rsquo;s page fill up alongside shuls across the country.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/join" className="bg-gold text-navy-deep font-bold rounded-lg px-8 py-4 text-center text-lg hover:bg-gold-soft transition-colors">
              Sign up your family →
            </Link>
            <Link href="/shuls" className="border border-cream/40 rounded-lg px-8 py-4 text-center text-lg hover:border-gold-soft hover:text-gold-soft transition-colors">
              See who&rsquo;s in from your shul
            </Link>
          </div>
          {live && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-14">
              <Stat value={stats.shuls} label={stats.shuls === 1 ? "shul" : "shuls"} />
              <Stat value={stats.members.toLocaleString()} label="people signed up" />
              <Stat value={stats.kids.toLocaleString()} label="children" />
              <Stat value={stats.checkins.toLocaleString()} label="Shabbos check-ins" />
            </div>
          )}
        </div>
      </section>

      {/* National highlight reel */}
      {stats.highlights.length > 0 && (
        <section className="bg-gold-pale border-b border-gold/30">
          <div className="mx-auto max-w-5xl px-4 py-8">
            <p className="text-center text-navy-deep font-display text-lg mb-4">What Klal Yisroel has taken on so far</p>
            <div className="flex flex-wrap justify-center gap-3">
              {stats.highlights.slice(0, 6).map((h) => (
                <div key={h.label} className="bg-white/70 rounded-full px-5 py-2 text-navy text-sm">
                  <span className="font-display text-lg text-gold mr-2 tabular-nums">{h.value.toLocaleString()}</span>
                  {h.label}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Three tiers */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-3xl sm:text-4xl text-navy mb-3 text-center" style={{ textWrap: "balance" }}>
          Three ways in: yourself, your family, your kehilla
        </h2>
        <p className="text-ink-soft text-center max-w-2xl mx-auto mb-10">
          The program from {PLATFORM.partner.name}. Pick what you&rsquo;ll hold every Shabbos this season.
          A few of the {SUGGESTION_TEMPLATE.filter((s) => s.tier !== "kehilla").length} choices:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {examples.map((t) => (
            <div key={t.key} className="bg-white rounded-2xl border border-parchment shadow-sm p-6 flex flex-col">
              <h3 className="font-display text-2xl text-navy mb-1">{t.title}</h3>
              <p className="text-ink-soft text-sm mb-4">{t.blurb}</p>
              <ul className="space-y-2 text-sm text-ink flex-1">
                {t.items.map((s) => (
                  <li key={s.title} className="flex gap-2">
                    <span className="text-gold shrink-0">✓</span>
                    <span>{s.title}</span>
                  </li>
                ))}
              </ul>
              {t.key !== "kehilla" ? (
                <Link href="/join" className="mt-5 text-sm font-semibold text-navy underline underline-offset-4 hover:text-gold">
                  Take one on →
                </Link>
              ) : (
                <span className="mt-5 text-sm text-ink-soft">Led by the rav; shown on your shul&rsquo;s page.</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-parchment/60">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="font-display text-3xl text-navy mb-8 text-center">How it works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              ["1", "Sign up your family", "Thirty seconds on your phone. Name your shul, add everyone in the house, and each person picks what they'll take on. No app, no passwords — a personal link is your login."],
              ["2", "Get the nudges", "A reminder Thursday with what everyone took on. After Shabbos, a ten-second check-in: tap “I did it.” Miss it and we'll nudge again."],
              ["3", "Watch it add up", "Your family's streak, your shul's page filling with families, and a national count of what Klal Yisroel has done for Shabbos this season."],
            ].map(([n, title, body]) => (
              <li key={n} className="bg-white rounded-2xl border border-parchment shadow-sm p-6">
                <div className="font-display text-gold text-4xl mb-2">{n}</div>
                <h3 className="font-semibold text-navy text-lg mb-2">{title}</h3>
                <p className="text-ink-soft text-sm leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Directory */}
      <section id="shuls" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-3xl text-navy mb-2 text-center">Shuls in the initiative</h2>
        <p className="text-ink-soft text-center mb-10">Tap yours to see who&rsquo;s already in — or be the first from your shul.</p>
        <ShulDirectory shuls={shuls} compact />
        <div className="text-center mt-10">
          <Link href="/join" className="inline-block bg-navy text-cream font-semibold rounded-lg px-8 py-3.5 hover:bg-navy-soft transition-colors">
            Sign up your family
          </Link>
        </div>
      </section>

      {/* Story */}
      <section className="bg-navy text-cream">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-gold-soft font-display tracking-widest uppercase text-sm mb-4">Where it started</p>
          <h2 className="font-display text-3xl mb-5">One shul, {PLATFORM.origin.season}</h2>
          <p className="text-cream/85 leading-relaxed mb-4">
            It began as the Elul Shabbos Project at {PLATFORM.origin.shul} in {PLATFORM.origin.city}: a whole
            community, every man, woman and child, taking on one small thing for Shabbos for the Shabbosos leading
            into Rosh Hashanah. Within days, over a hundred families had signed up. Within a week, other shuls were
            asking how to do the same.
          </p>
          <p className="text-cream/85 leading-relaxed mb-8">
            Together with {PLATFORM.partner.name}, it&rsquo;s now open to every shul. Same idea, same tools, your community.
          </p>
          <Link href="/join" className="inline-block bg-gold text-navy-deep font-bold rounded-lg px-10 py-4 text-lg hover:bg-gold-soft transition-colors">
            Sign up your family
          </Link>
          <p className="text-cream/55 text-sm mt-5">
            Running it for your whole shul, with your own site and admin?{" "}
            <Link href="/start" className="underline hover:text-gold-soft">Start here</Link>. Questions:{" "}
            <a href={`mailto:${PLATFORM.contactEmail}`} className="underline hover:text-gold-soft">{PLATFORM.contactEmail}</a>
          </p>
        </div>
      </section>
    </div>
  );
}
