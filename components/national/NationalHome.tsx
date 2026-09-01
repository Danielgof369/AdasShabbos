import Link from "next/link";
import { PLATFORM } from "@/lib/platform";
import type { NationalStats } from "@/lib/stats";
import ShulDirectory, { type DirectoryShul } from "@/components/national/ShulDirectory";

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-white/10 rounded-xl border border-cream/15 px-4 py-5 text-center">
      <div className="font-display text-3xl sm:text-4xl text-gold-soft">{value}</div>
      <div className="text-cream/75 text-sm mt-1">{label}</div>
    </div>
  );
}

export default function NationalHome({
  stats,
  shuls,
}: {
  stats: NationalStats;
  shuls: DirectoryShul[];
}) {
  const live = stats.shuls > 0;
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-cream relative overflow-hidden">
        <div className="glow-dot absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full" />
        <div className="glow-dot absolute -bottom-40 -left-20 h-96 w-96 rounded-full opacity-60" />
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ksi-logo-white.png" alt={PLATFORM.name} className="h-36 sm:h-48 w-auto mb-8" />
          <p className="text-gold-soft font-display tracking-[0.25em] uppercase text-sm mb-5">
            A national Shabbos campaign
          </p>
          <h1 className="font-display text-4xl sm:text-6xl leading-[1.08] mb-6 max-w-3xl">
            One small thing for Shabbos.
            <br />
            Every week. <span className="text-gold-soft">Every shul.</span>
          </h1>
          <p className="text-cream/85 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
            Every man, woman and child in your shul takes on one extra way to
            honor Shabbos and holds it for a few weeks. We send the reminders,
            collect the check-ins, run the raffle, and show the whole community
            what they&rsquo;ve built together. Free for any shul, live in ten minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/start"
              className="bg-gold text-navy-deep font-bold rounded-lg px-8 py-4 text-center text-lg hover:bg-gold-soft transition-colors"
            >
              Bring it to your shul →
            </Link>
            <Link
              href="/shuls"
              className="border border-cream/40 rounded-lg px-8 py-4 text-center text-lg hover:border-gold-soft hover:text-gold-soft transition-colors"
            >
              Find your shul
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
            <p className="text-center text-navy-deep font-display text-lg mb-4">
              What Klal Yisroel has taken on so far
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {stats.highlights.slice(0, 6).map((h) => (
                <div key={h.label} className="bg-white/70 rounded-full px-5 py-2 text-navy text-sm">
                  <span className="font-display text-lg text-gold mr-2">{h.value.toLocaleString()}</span>
                  {h.label}
                </div>
              ))}
              {stats.pledgeTotal > 0 && (
                <div className="bg-white/70 rounded-full px-5 py-2 text-navy text-sm">
                  <span className="font-display text-lg text-gold mr-2">
                    ${stats.pledgeTotal.toLocaleString()}
                  </span>
                  pledged to tzedakah
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* How it works for a shul */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-3xl sm:text-4xl text-navy mb-3 text-center">
          How it works
        </h2>
        <p className="text-ink-soft text-center max-w-2xl mx-auto mb-10">
          Built by a shul, for shuls. Your rav announces it, your families sign
          up on their phones, and the platform does the follow-up so nobody has
          to chase anyone.
        </p>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              n: "1",
              title: "Set up your shul",
              body: "Two minutes: your shul's name, your Shabbos dates, a password. You get your own site at yourshul.kabbolasshabbos.com with a ready-made list of commitments you can edit.",
            },
            {
              n: "2",
              title: "Families take on one thing",
              body: "Each person — parents and children — picks a commitment to hold for the whole campaign. No passwords, no app to install; a personal link is their login.",
            },
            {
              n: "3",
              title: "We do the follow-up",
              body: "Thursday reminders, Motzei Shabbos check-ins, chasers every two days, a weekly family raffle, and a live count on your homepage of what the shul has done together.",
            },
          ].map((s) => (
            <li key={s.n} className="bg-white rounded-2xl border border-parchment shadow-sm p-6">
              <div className="font-display text-gold text-4xl mb-2">{s.n}</div>
              <h3 className="font-semibold text-navy text-lg mb-2">{s.title}</h3>
              <p className="text-ink-soft text-sm leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* What you get */}
      <section className="bg-parchment/60">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="font-display text-3xl text-navy mb-8 text-center">
            Everything a campaign needs, out of the box
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ["🕯️", "Your own site", "yourshul.kabbolasshabbos.com, with your logo and your partner's, or your own domain."],
              ["📝", "A commitment list you own", "24 tested ideas for adults and children to start from. Add, hide, or rewrite any of them."],
              ["📬", "Reminders that actually go out", "Thursday what-you-took-on emails, Motzei Shabbos check-in nudges, and chasers every two days until they do."],
              ["✓", "Ten-second check-ins", "Every person taps “I did it.” Streaks, avatars, and a family wall keep the kids coming back."],
              ["🍕", "Weekly family raffle", "Every family where everyone checked in is entered. Draw the winner in one click; paste the announcement to WhatsApp."],
              ["📊", "A live count for the whole shul", "Minutes added to Shabbos, tables set, perakim said — the homepage shows what the community has built."],
              ["💛", "A pledge that turns signups into tzedakah", "Optional: a sponsor gives $5 per family to Tomchei Shabbos (or any cause you choose)."],
              ["📣", "Ready-to-paste WhatsApp blasts", "Pre-Shabbos, post-Shabbos, and raffle-winner messages written for you, updated each week."],
              ["🔒", "Your data, your admin", "Each shul has its own admin, its own password, and its own families. Export a CSV any time."],
            ].map(([icon, title, body]) => (
              <div key={title} className="bg-white rounded-xl border border-parchment p-5">
                <div className="text-2xl mb-2">{icon}</div>
                <h3 className="font-semibold text-navy mb-1">{title}</h3>
                <p className="text-ink-soft text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Directory */}
      <section id="shuls" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-3xl text-navy mb-2 text-center">
          Shuls in the campaign
        </h2>
        <p className="text-ink-soft text-center mb-10">
          Find yours and sign up — or be the first in your city.
        </p>
        <ShulDirectory shuls={shuls} compact />
        <div className="text-center mt-10">
          <Link
            href="/start"
            className="inline-block bg-navy text-cream font-semibold rounded-lg px-8 py-3.5 hover:bg-navy-soft transition-colors"
          >
            Add your shul
          </Link>
        </div>
      </section>

      {/* Story */}
      <section className="bg-navy text-cream">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-gold-soft font-display tracking-widest uppercase text-sm mb-4">
            Where it started
          </p>
          <h2 className="font-display text-3xl mb-5">
            One shul, {PLATFORM.origin.season}
          </h2>
          <p className="text-cream/85 leading-relaxed mb-4">
            {PLATFORM.name} began as the Elul Shabbos Project at {PLATFORM.origin.shul} in{" "}
            {PLATFORM.origin.city}: a whole community, every man, woman and child, taking on one
            small thing for Shabbos for the four Shabbosos leading into Rosh Hashanah. Within
            days, over a hundred families had signed up. Within a week, other shuls were asking
            how to do the same.
          </p>
          <p className="text-cream/85 leading-relaxed mb-8">
            So we made it something any shul can run. Same idea, same tools, your community.
          </p>
          <Link
            href="/start"
            className="inline-block bg-gold text-navy-deep font-bold rounded-lg px-10 py-4 text-lg hover:bg-gold-soft transition-colors"
          >
            Start your shul&rsquo;s campaign
          </Link>
          <p className="text-cream/55 text-sm mt-5">
            Free. No contracts. Questions:{" "}
            <a href={`mailto:${PLATFORM.contactEmail}`} className="underline hover:text-gold-soft">
              {PLATFORM.contactEmail}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
