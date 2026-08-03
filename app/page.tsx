import Link from "next/link";
import { getCampaign, activeWeek, shabbosOfWeek, formatShabbosDate, weekNumber } from "@/lib/campaign";
import { getCampaignStats } from "@/lib/stats";
import { prisma } from "@/lib/db";
import { LogoOnDark } from "@/components/Logo";

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
  const adultIdeas = suggestions.filter((s) => s.audience !== "kid");
  const kidIdeas = suggestions.filter((s) => s.audience !== "adult");

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

      {/* Commitment ideas */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="font-display text-3xl text-navy mb-8 text-center">
          What you can take on
        </h2>
        <h3 className="font-display text-xl text-navy mb-4">For adults</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {adultIdeas.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-parchment px-5 py-4"
            >
              <h4 className="font-semibold text-navy">{s.title}</h4>
              {s.detail && (
                <p className="text-ink-soft text-sm mt-1">{s.detail}</p>
              )}
            </div>
          ))}
        </div>
        <h3 className="font-display text-xl text-navy mb-4">
          For kids (grades 5–8)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {kidIdeas.map((s) => (
            <div
              key={s.id}
              className="bg-gold-pale/50 rounded-xl border border-gold/30 px-5 py-4"
            >
              <h4 className="font-semibold text-navy">{s.title}</h4>
              {s.detail && (
                <p className="text-ink-soft text-sm mt-1">{s.detail}</p>
              )}
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
