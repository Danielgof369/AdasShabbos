import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { PLATFORM } from "@/lib/platform";
import type { NationalStats } from "@/lib/stats";
import ShulDirectory, { type DirectoryShul } from "@/components/national/ShulDirectory";
import CitiesBoard from "@/components/national/CitiesBoard";
import type { CityRow } from "@/lib/directory";

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

export default function NationalHome({ stats, shuls, cities, seasonLabel }: { stats: NationalStats; shuls: DirectoryShul[]; cities: CityRow[]; seasonLabel: string }) {
  const live = stats.shuls > 0 || stats.members > 0;
  const partnerDark = partnerLogo("dark");
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-cream relative overflow-hidden">
        <div className="glow-dot absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full" />
        <div className="glow-dot absolute -bottom-40 -left-20 h-96 w-96 rounded-full opacity-60" />
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20 relative">
          <div className="flex items-center gap-6 sm:gap-8 mb-8">
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ksi-mark-white.png" alt="" className="h-28 sm:h-36 w-auto" />
              <span className="font-display tracking-[0.2em] uppercase text-base sm:text-lg text-cream">
                {PLATFORM.name}
              </span>
            </div>
            {partnerDark && (
              <>
                <span className="h-24 sm:h-32 w-px bg-cream/25" aria-hidden />
                <a href={PLATFORM.partner.url} target="_blank" rel="noreferrer" title={PLATFORM.partner.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={partnerDark} alt={PLATFORM.partner.name} className="h-28 sm:h-40 w-auto" />
                </a>
              </>
            )}
          </div>
          <p className="text-gold-soft font-display tracking-[0.25em] uppercase text-sm mb-5">
            {seasonLabel} &middot; in partnership with{" "}
            <a href={PLATFORM.partner.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-gold">{PLATFORM.partner.name}</a>
          </p>
          <h1 className="font-display text-4xl sm:text-6xl leading-[1.08] mb-6 max-w-3xl" style={{ textWrap: "balance" }}>
            One small thing for Shabbos.
            <br />
            Every week. <span className="text-gold-soft">Together.</span>
          </h1>
          <p className="text-cream/85 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
            Take on one small thing for Shabbos and hold it every week of {seasonLabel}.
            Sign up your family in thirty seconds; we&rsquo;ll remind you before Shabbos and
            check in after.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/join" className="bg-gold text-navy-deep font-bold rounded-lg px-8 py-4 text-center text-lg hover:bg-gold-soft transition-colors">
              Sign up your family →
            </Link>
            <Link href="/whos-in" className="border border-cream/40 rounded-lg px-8 py-4 text-center text-lg hover:border-gold-soft hover:text-gold-soft transition-colors">
              See who&rsquo;s already in
            </Link>
          </div>
          {live && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-14">
              <Stat value={stats.households.toLocaleString()} label={stats.households === 1 ? "family" : "families"} />
              <Stat value={stats.members.toLocaleString()} label="people" />
              <Stat value={stats.kids.toLocaleString()} label="children" />
              <Stat value={stats.cities.toLocaleString()} label={stats.cities === 1 ? "city" : "cities"} />
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

      {/* What everyone is taking on */}
      {stats.takenOn.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="font-display text-3xl text-navy mb-2 text-center" style={{ textWrap: "balance" }}>
            What everyone is taking on this Shabbos
          </h2>
          <p className="text-ink-soft text-center mb-8">
            Week {stats.week} of {stats.weeks} &middot; {stats.members.toLocaleString()} people, {stats.cities} {stats.cities === 1 ? "city" : "cities"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.takenOn.map((t) => (
              <div key={t.title} className="flex items-center justify-between gap-4 bg-white rounded-xl border border-parchment px-5 py-4">
                <span className="text-navy font-medium">{t.title}</span>
                <span className="shrink-0 font-display text-2xl text-gold tabular-nums">
                  {t.people.toLocaleString()} <span className="text-xs text-ink-soft font-sans">{t.people === 1 ? "person" : "people"}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/join" className="inline-block bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-lg hover:bg-gold-soft transition-colors">
              Add yours
            </Link>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="bg-parchment/60">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="font-display text-3xl text-navy mb-8 text-center">How it works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              ["1", "Sign up", "Thirty seconds on your phone, on your own or with the whole house. Each person picks what they'll take on. No app, no passwords — a personal link is your login."],
              ["2", "Get the nudges", "A reminder Thursday with what everyone took on. After Shabbos, a ten-second check-in: tap “I did it.” Miss it and we'll nudge again."],
              ["3", "Watch it add up", "Your family's streak, your city on the board, and a national count of what Klal Yisroel has done for Shabbos this season."],
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

      {/* Who's in */}
      <section id="whos-in" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-3xl text-navy mb-2 text-center">Who&rsquo;s in</h2>
        <p className="text-ink-soft text-center mb-10">Families across the country, city by city.</p>
        <CitiesBoard cities={cities} compact />
        {shuls.length > 0 && (
          <div className="mt-10">
            <ShulDirectory shuls={shuls} compact />
          </div>
        )}
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
            Together with {PLATFORM.partner.name}, it&rsquo;s now open to everyone, everywhere. Same idea, same tools.
          </p>
          <Link href="/join" className="inline-block bg-gold text-navy-deep font-bold rounded-lg px-10 py-4 text-lg hover:bg-gold-soft transition-colors">
            Sign up your family
          </Link>
          <p className="text-cream/55 text-sm mt-5">
            Questions:{" "}
            <a href={`mailto:${PLATFORM.contactEmail}`} className="underline hover:text-gold-soft">{PLATFORM.contactEmail}</a>
          </p>
        </div>
      </section>
    </div>
  );
}
