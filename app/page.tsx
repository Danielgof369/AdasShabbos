import Link from "next/link";
import { getCampaign, activeWeek, shabbosOfWeek, formatShabbosDate, weekNumber } from "@/lib/campaign";
import { getCampaignStats } from "@/lib/stats";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const campaign = await getCampaign();
  const week = activeWeek(campaign);
  const rawWeek = weekNumber(campaign);
  const stats = await getCampaignStats(week);
  const suggestions = await prisma.suggestion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });

  const started = rawWeek >= 1;
  const nextShabbos = shabbosOfWeek(campaign, week);

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-cream relative overflow-hidden">
        <div className="glow-dot absolute -top-24 right-0 h-96 w-96 rounded-full" />
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20 relative">
          <p className="text-gold-soft font-display tracking-widest uppercase text-sm mb-4">
            Elul 5786 &middot; A whole-shul campaign
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-6">
            One small thing for Shabbos.
            <br />
            Every week of Elul.
          </h1>
          <p className="text-cream/85 text-lg max-w-xl mb-8">
            Men, women, and kids — everyone picks one extra way to honor
            Shabbos each week. Light candles a little early, set a beautiful
            table, bake challah. Small commitments, taken on together.
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
            <div className="text-ink-soft text-sm">people signed up</div>
          </div>
          <div>
            <div className="font-display text-2xl text-navy">{stats.kids}</div>
            <div className="text-ink-soft text-sm">kids joining</div>
          </div>
          <div>
            <div className="font-display text-2xl text-navy">{stats.checkins}</div>
            <div className="text-ink-soft text-sm">check-ins so far</div>
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

      {/* Sample commitments */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="font-display text-3xl text-navy mb-8 text-center">
          Ideas to choose from
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-parchment px-5 py-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-navy">{s.title}</h3>
                {s.kidFriendly && (
                  <span className="shrink-0 text-xs bg-gold-pale text-navy-deep rounded-full px-2 py-0.5 mt-0.5">
                    kids too
                  </span>
                )}
              </div>
              {s.detail && (
                <p className="text-ink-soft text-sm mt-1">{s.detail}</p>
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/signup"
            className="inline-block bg-navy text-cream font-semibold rounded-lg px-8 py-3.5 text-lg hover:bg-navy-soft transition-colors"
          >
            Join the campaign
          </Link>
        </div>
      </section>
    </div>
  );
}
