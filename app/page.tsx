import Link from "next/link";
import { getCampaign, activeWeek, shabbosOfWeek, formatShabbosDate, weekNumber } from "@/lib/campaign";
import { getCampaignStats } from "@/lib/stats";
import { prisma } from "@/lib/db";
import { LogoOnDark } from "@/components/Logo";
import { parseCategories, CATEGORY_LABELS } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function Home() {
  const campaign = await getCampaign();
  const week = activeWeek(campaign);
  const rawWeek = weekNumber(campaign);
  const stats = await getCampaignStats(week);
  const suggestions = await prisma.suggestion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const started = rawWeek >= 1;
  const nextShabbos = shabbosOfWeek(campaign, week);

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-cream relative overflow-hidden">
        <div className="glow-dot absolute -top-24 right-0 h-96 w-96 rounded-full" />
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20 relative">
          <div className="mb-6">
            <LogoOnDark className="h-14 w-auto" />
          </div>
          <p className="text-gold-soft font-display tracking-widest uppercase text-sm mb-4">
            Elul 5786 &middot; A whole-shul campaign of Adas Torah
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-6">
            One small thing for Shabbos.
            <br />
            Every week of Elul.
          </h1>
          <p className="text-cream/85 text-lg max-w-xl mb-8">
            Every man, woman, and kid picks one extra way to honor Shabbos
            each week. Learn at the table, set it Thursday night, sing the
            zemiros. Small commitments, taken on together.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-center text-lg hover:bg-gold-soft transition-colors"
            >
              Sign up to join
            </Link>
            <Link
              href="/find"
              className="border border-cream/40 rounded-lg px-8 py-3.5 text-center text-lg hover:border-gold-soft hover:text-gold-soft transition-colors"
            >
              Check in for this week
            </Link>
          </div>
          <p className="mt-6 text-cream/60 text-sm">
            {started ? (
              <>Week {week} of {campaign.weeks} &middot; Shabbos {formatShabbosDate(nextShabbos)}</>
            ) : (
              <>Campaign begins the week of {formatShabbosDate(shabbosOfWeek(campaign, 1))}</>
            )}
          </p>
        </div>
      </section>

      {/* Pledge banner */}
      <section className="bg-gold-pale border-y border-gold/30">
        <div className="mx-auto max-w-3xl px-4 py-5 text-center">
          <p className="text-navy-deep">
            <span className="font-semibold">
              ${stats.pledgeTotal.toLocaleString()}
            </span>{" "}
            pledged so far to <span className="font-semibold">{stats.charityName}</span> —
            ${campaign.pledgePerSignup} for every signup, ${campaign.pledgePerCheckin} for
            every weekly check-in.
          </p>
        </div>
      </section>

      {/* Why we're doing this */}
      <section className="mx-auto max-w-3xl px-4 pt-10">
        <details className="group bg-white rounded-2xl border border-parchment shadow-sm">
          <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-3">
            <span className="font-display text-xl sm:text-2xl text-navy">
              Why we&rsquo;re doing this
            </span>
            <span className="text-gold text-xl transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="px-6 pb-6 text-ink-soft leading-relaxed space-y-4 border-t border-parchment pt-5">
            <p>
              Before Rosh Hashanah 5784, Rabbi Revah shared a teaching of the
              Aruch LaNer: when Rosh Hashanah falls on Shabbos and the shofar
              goes silent, the year that follows tends to be extraordinary,
              for blessing or for tragedy. On that day it is not the shofar
              that pleads for Klal Yisroel. It is Shabbos itself that stands
              as our <strong className="text-navy">meileitz yosher</strong>,
              our advocate. How we hold Shabbos becomes how the year holds us.
            </p>
            <p>
              We all remember what came one month later. October 7th changed
              us, and demanded that we re-examine who we are and what we are
              committed to.
            </p>
            <p className="font-medium text-navy">
              This year, Rosh Hashanah falls on Shabbos again.
            </p>
            <p>
              So this Elul we are doing our part, every man, woman, and child
              of Adas Torah, to send Shabbos into the new year as our
              advocate. One small commitment, each week, together.
            </p>
          </div>
        </details>
      </section>

      {/* Highlight reel */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="font-display text-3xl text-navy mb-2 text-center">
          What our shul has taken on
        </h2>
        <p className="text-ink-soft text-center mb-8">
          Every check-in adds to the count — watch it grow each week.
        </p>
        {stats.highlights.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {stats.highlights.slice(0, 6).map((h) => (
              <div
                key={h.label}
                className="bg-white rounded-xl border border-parchment shadow-sm px-5 py-6 text-center"
              >
                <div className="font-display text-4xl text-gold mb-1">
                  {h.value.toLocaleString()}
                </div>
                <div className="text-ink-soft text-sm">{h.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-parchment shadow-sm px-5 py-8 text-center text-ink-soft mb-6">
            The reel starts filling in after the first Shabbos — sign up and be
            part of the first numbers.
          </div>
        )}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-display text-2xl text-navy">{stats.members}</div>
            <div className="text-ink-soft text-sm">
              {stats.members === 1 ? "person signed up" : "people signed up"}
            </div>
          </div>
          <div>
            <div className="font-display text-2xl text-navy">{stats.kids}</div>
            <div className="text-ink-soft text-sm">
              {stats.kids === 1 ? "kid joining" : "kids joining"}
            </div>
          </div>
          <div>
            <div className="font-display text-2xl text-navy">{stats.checkins}</div>
            <div className="text-ink-soft text-sm">
              {stats.checkins === 1 ? "check-in so far" : "check-ins so far"}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-parchment/60">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="font-display text-3xl text-navy mb-8 text-center">
            How it works
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                n: "1",
                title: "Pick your thing",
                body: "Sign up with your name and phone or email, and choose one extra Shabbos commitment for the week — for yourself, and for the kids too.",
              },
              {
                n: "2",
                title: "Get a nudge",
                body: "A friendly reminder arrives Thursday so you're ready before Shabbos, and again after Shabbos to check in.",
              },
              {
                n: "3",
                title: "Check in & keep going",
                body: "Tap “I did it,” watch the shul-wide numbers climb, and pick your commitment for next week — same thing, or something new.",
              },
            ].map((s) => (
              <li key={s.n} className="bg-white rounded-xl border border-parchment p-6">
                <div className="font-display text-gold text-3xl mb-2">{s.n}</div>
                <h3 className="font-semibold text-navy mb-2">{s.title}</h3>
                <p className="text-ink-soft text-sm leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Commitment ideas */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="font-display text-3xl text-navy mb-2 text-center">
          What you can take on
        </h2>
        <p className="text-ink-soft text-center mb-8">
          Every option is tagged for who it&rsquo;s for — men, women, boys, girls.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-parchment px-5 py-4"
            >
              <h4 className="font-semibold text-navy">{s.title}</h4>
              {s.detail && (
                <p className="text-ink-soft text-sm mt-1">{s.detail}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {parseCategories(s.categories).map((c) => (
                  <span
                    key={c}
                    className="text-[11px] uppercase tracking-wide bg-gold-pale text-navy-deep rounded-full px-2 py-0.5"
                  >
                    {CATEGORY_LABELS[c]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-ink-soft text-sm text-center mt-6">
          …or write in your own idea when you sign up.
        </p>
      </section>

      {/* Kids' incentives */}
      <section className="bg-navy text-cream">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="font-display text-3xl mb-2 text-center">
            Prizes for the kids
          </h2>
          <p className="text-cream/70 text-center mb-8">
            Taking on Shabbos should be sweet.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: "🍷",
                title: "A kiddush just for the boys",
                body: "Every boy who signs up gets a special kiddush in their honor the first week.",
              },
              {
                icon: "🎁",
                title: "Gift card for every girl",
                body: "Every girl who signs up for a commitment gets an Amazon gift card.",
              },
              {
                icon: "🎟️",
                title: "Weekly raffle",
                body: "Did your commitment? Every check-in is an entry into that week's raffle.",
              },
              {
                icon: "🚌",
                title: "The grand trip",
                body: "Complete all 4 weeks and you're on the end-of-Elul trip.",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-cream/20 bg-navy-soft/40 p-5"
              >
                <div className="text-3xl mb-2">{p.icon}</div>
                <h3 className="font-semibold text-gold-soft mb-1">{p.title}</h3>
                <p className="text-cream/80 text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-12 text-center">
        <Link
          href="/signup"
          className="inline-block bg-navy text-cream font-semibold rounded-lg px-8 py-3.5 text-lg hover:bg-navy-soft transition-colors"
        >
          Join the campaign
        </Link>
      </section>
    </div>
  );
}
