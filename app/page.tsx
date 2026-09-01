import Link from "next/link";
import { cookies } from "next/headers";
import {
  campaignOf,
  activeWeek,
  shabbosOfWeek,
  formatShabbosDate,
  weekNumber,
} from "@/lib/campaign";
import { lastShabbosWeek } from "@/lib/household";
import { getCampaignStats, getNationalStats } from "@/lib/stats";
import { raffleDraws } from "@/lib/raffle";
import { prisma } from "@/lib/db";
import { BrandMark } from "@/components/Logo";
import { currentShul, unknownSubdomain, rootBaseUrl, ROOT_DOMAIN } from "@/lib/tenant";
import { listDirectoryShuls } from "@/lib/directory";
import { whyParagraphs, announcementOf, pluralWeeks } from "@/lib/copy";
import { PLATFORM } from "@/lib/platform";
import JoinNudge from "@/components/JoinNudge";
import HomePopups from "@/components/HomePopups";
import NationalHome from "@/components/national/NationalHome";

export const dynamic = "force-dynamic";

/** A subdomain nobody has claimed yet. */
function UnclaimedShul({ slug }: { slug: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="text-5xl mb-4">🕯️</div>
      <h1 className="font-display text-3xl text-navy mb-3">
        No shul at <span className="text-gold">{slug}.{ROOT_DOMAIN}</span> yet
      </h1>
      <p className="text-ink-soft mb-8">
        Either the link has a typo, or this address is still free. Setting up a
        shul takes two minutes.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={`${rootBaseUrl()}/start?slug=${encodeURIComponent(slug)}`}
          className="bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 hover:bg-gold-soft transition-colors"
        >
          Claim {slug} for your shul
        </a>
        <a
          href={`${rootBaseUrl()}/shuls`}
          className="border border-navy/30 text-navy font-semibold rounded-lg px-8 py-3.5 hover:border-gold transition-colors"
        >
          Find your shul
        </a>
      </div>
    </div>
  );
}

export default async function Home() {
  const shul = await currentShul();
  if (!shul) {
    const missing = await unknownSubdomain();
    if (missing) return <UnclaimedShul slug={missing} />;
    const [stats, shuls] = await Promise.all([getNationalStats(), listDirectoryShuls()]);
    return <NationalHome stats={stats} shuls={shuls} />;
  }

  const campaign = campaignOf(shul);
  const week = activeWeek(campaign);
  const rawWeek = weekNumber(campaign);
  const stats = await getCampaignStats(campaign, week);
  const suggestions = await prisma.suggestion.findMany({
    where: { shulId: shul.id, active: true },
    orderBy: { sortOrder: "asc" },
  });
  const resources = await prisma.resource.findMany({
    where: { shulId: shul.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 2,
  });

  const started = rawWeek >= 1;
  const nextShabbos = shabbosOfWeek(campaign, week);
  const firstShabbos = formatShabbosDate(campaign, shabbosOfWeek(campaign, 1));
  const lastShabbos = formatShabbosDate(campaign, shabbosOfWeek(campaign, campaign.weeks));
  const draws = campaign.raffleEnabled ? await raffleDraws(shul.id) : [];
  const latestDraw = draws.length > 0 ? draws[draws.length - 1] : null;
  const myToken = (await cookies()).get("elul_token")?.value;
  const checkinHref = myToken ? `/c/${encodeURIComponent(myToken)}` : "/find";
  const why = whyParagraphs(shul);
  const announcement = announcementOf(shul);

  // Is a check-in window open (last Shabbos still accepting check-ins)?
  const DAY_MS = 24 * 60 * 60 * 1000;
  const lastWeek = lastShabbosWeek(campaign);
  const checkinOpen =
    lastWeek >= 1 &&
    Date.now() - shabbosOfWeek(campaign, lastWeek).getTime() <= 8 * DAY_MS;
  const lastLabel = lastWeek >= 1 ? formatShabbosDate(campaign, shabbosOfWeek(campaign, lastWeek)) : "";

  // Known family with check-ins still waiting? Make it personal.
  let familyNudge: { name: string; waiting: number } | null = null;
  if (checkinOpen && myToken) {
    const hh = await prisma.household.findUnique({
      where: { shulId_token: { shulId: shul.id, token: myToken } },
      include: { members: { include: { goals: { where: { week: lastWeek } } } } },
    });
    if (hh) {
      const waiting = hh.members.reduce(
        (n, m) => n + m.goals.filter((g) => !g.checkedInAt).length,
        0
      );
      if (waiting > 0) {
        familyNudge = { name: hh.familyName ?? "Your", waiting };
      }
    }
  }

  const perks = campaign.pledgeEnabled || campaign.raffleEnabled;

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-cream relative overflow-hidden">
        <div className="glow-dot absolute -top-24 right-0 h-96 w-96 rounded-full" />
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20 relative">
          <div className="mb-6 flex items-center gap-5">
            <BrandMark src={shul.logoDark} label={shul.name} tone="dark" className="h-14 w-auto" />
            {shul.partnerName && (
              <>
                <span className="h-12 w-px bg-cream/25" aria-hidden />
                <BrandMark
                  src={shul.partnerLogoDark}
                  label={shul.partnerName}
                  tone="dark"
                  className="h-12 w-auto"
                />
              </>
            )}
          </div>
          <p className="text-gold-soft font-display tracking-widest uppercase text-sm mb-4">
            {campaign.seasonLabel} &middot; A campaign of {shul.name}
            {shul.partnerName ? ` & ${shul.partnerName}` : ""}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-6">
            One small thing for Shabbos.
            <br />
            Every week.
          </h1>
          <p className="text-cream/85 text-lg max-w-xl mb-8">
            Every man, woman, and child takes on one extra way to honor
            Shabbos, held for {pluralWeeks(campaign.weeks)}
            {campaign.weeks > 1 ? `, ${firstShabbos} through ${lastShabbos}` : ` on ${firstShabbos}`}.
            Learn at the table, set it Thursday night, sing the zemiros. Small
            commitments, taken on together.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {checkinOpen ? (
              <>
                <Link
                  href={checkinHref}
                  className="bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-center text-lg hover:bg-gold-soft transition-colors"
                >
                  ✓ Check in for Shabbos {lastLabel}
                </Link>
                <Link
                  href="/signup"
                  className="border border-cream/40 rounded-lg px-8 py-3.5 text-center text-lg hover:border-gold-soft hover:text-gold-soft transition-colors"
                >
                  Sign up to join
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-center text-lg hover:bg-gold-soft transition-colors"
                >
                  Sign up to join
                </Link>
                <Link
                  href={checkinHref}
                  className="border border-cream/40 rounded-lg px-8 py-3.5 text-center text-lg hover:border-gold-soft hover:text-gold-soft transition-colors"
                >
                  Check in for this week
                </Link>
              </>
            )}
          </div>
          <p className="mt-6 text-cream/60 text-sm">
            {started ? (
              <>Week {week} of {campaign.weeks} &middot; Shabbos {formatShabbosDate(campaign, nextShabbos)}</>
            ) : (
              <>Campaign begins the week of {firstShabbos}</>
            )}
          </p>
        </div>
      </section>

      {/* Personal check-in nudge */}
      {familyNudge && (
        <section className="bg-gold border-b border-gold-soft">
          <Link
            href={checkinHref}
            className="block mx-auto max-w-3xl px-4 py-4 text-navy-deep hover:opacity-90 transition-opacity"
          >
            <p className="text-center font-medium">
              🔔 <span className="font-bold">The {familyNudge.name} Family:</span>{" "}
              {familyNudge.waiting} check-in{familyNudge.waiting === 1 ? "" : "s"} still
              waiting for Shabbos {lastLabel} —{" "}
              <span className="underline underline-offset-2 font-bold">
                tap here, it takes 10 seconds →
              </span>
            </p>
          </Link>
        </section>
      )}

      {/* Pledge banner */}
      {campaign.pledgeEnabled && (
        <section className="bg-gold-pale border-y border-gold/30">
          <div className="mx-auto max-w-3xl px-4 py-5 text-center">
            <p className="text-navy-deep">
              <span className="font-semibold">
                ${stats.pledgeTotal.toLocaleString()}
              </span>{" "}
              pledged so far to <span className="font-semibold">{stats.charityName}</span> —
              ${campaign.pledgePerSignup} for every family that signs up.
            </p>
          </div>
        </section>
      )}

      {/* Raffle winner */}
      {latestDraw && (
        <section className="mx-auto max-w-3xl px-4 pt-10">
          <div className="bg-white rounded-2xl border border-gold/40 shadow-sm px-6 py-5 text-center">
            <p className="text-navy">
              🎉 Mazeltov to the{" "}
              <span className="font-display text-lg text-navy-deep font-semibold">
                {latestDraw.familyName}
              </span>{" "}
              family on winning this week&rsquo;s {campaign.rafflePrize} raffle! Your family
              could be next! Check in after Shabbos if you completed what
              you took on — and be automatically entered into next
              week&rsquo;s raffle!
            </p>
          </div>
        </section>
      )}

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
            {why.map((p, i) => (
              <p key={i} className={p.length < 80 ? "font-medium text-navy" : undefined}>
                {p}
              </p>
            ))}
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
              {stats.kids === 1 ? "child joined" : "children joined"}
            </div>
          </div>
          <div>
            <div className="font-display text-2xl text-navy">{stats.checkins}</div>
            <div className="text-ink-soft text-sm">
              {stats.checkins === 1 ? "check-in so far" : "check-ins so far"}
            </div>
          </div>
        </div>
        <div className="text-center mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/signup"
            className="inline-block bg-navy text-cream font-semibold rounded-lg px-8 py-3.5 hover:bg-navy-soft transition-colors"
          >
            Add your family to the count
          </Link>
          <Link
            href="/families"
            className="inline-block border border-navy/30 text-navy font-semibold rounded-lg px-8 py-3.5 hover:border-gold hover:text-navy-deep transition-colors"
          >
            🏅 See who's joined
          </Link>
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
                body: `Sign up with your name and email, and choose one or more Shabbos commitments to hold for all ${campaign.weeks > 1 ? `${campaign.weeks} weeks` : "of it"} — for yourself, and for the children too.`,
              },
              {
                n: "2",
                title: "Get a nudge",
                body: "A friendly reminder arrives Thursday so you're ready before Shabbos, and again after Shabbos to check in.",
              },
              {
                n: "3",
                title: "Check in & keep going",
                body: "Tap “I did it,” watch the shul-wide numbers climb, and add another commitment whenever you're ready.",
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
          When you sign up, adults and children each see the options meant for them.
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
            </div>
          ))}
        </div>
        {resources.length > 0 && (
          <div className={`mt-6 grid grid-cols-1 ${resources.length > 1 ? "sm:grid-cols-2" : ""} gap-3`}>
            {resources.map((r) => (
              <div key={r.id} className="bg-gold-pale/60 border border-gold/30 rounded-xl px-5 py-4 text-center">
                <p className="text-navy text-sm">
                  {r.emoji}{" "}
                  {r.kicker && <span className="font-semibold">{r.kicker}:</span>}{" "}
                  <a
                    href={r.url}
                    target="_blank"
                    className="underline underline-offset-2 font-semibold hover:text-navy-deep"
                  >
                    {r.title}
                  </a>
                  {r.byline ? ` ${r.byline}` : ""}
                  {" "}·{" "}
                  <Link href="/resources" className="underline underline-offset-2 hover:text-navy-deep">
                    all resources
                  </Link>
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <Link
            href="/signup"
            className="inline-block bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-lg hover:bg-gold-soft transition-colors"
          >
            Join now — it takes 30 seconds
          </Link>
        </div>
      </section>

      {/* What your signup gives */}
      {perks && (
        <section className="bg-navy text-cream">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 className="font-display text-3xl mb-2 text-center">
              {campaign.pledgeEnabled ? "Every family that joins, gives." : "Every family that checks in, wins."}
            </h2>
            <p className="text-cream/70 text-center mb-8">
              Your commitment does more than build your own Shabbos.
            </p>
            <div className={`grid grid-cols-1 ${campaign.pledgeEnabled && campaign.raffleEnabled ? "sm:grid-cols-2" : ""} gap-4`}>
              {campaign.pledgeEnabled && (
                <div className="rounded-xl border border-cream/20 bg-navy-soft/40 p-5 text-center">
                  <div className="font-display text-4xl text-gold-soft mb-1">
                    ${campaign.pledgePerSignup}
                  </div>
                  <p className="text-cream/85 text-sm leading-relaxed">
                    to <strong>{stats.charityName}</strong> for every family that
                    signs up
                  </p>
                </div>
              )}
              {campaign.raffleEnabled && (
                <div className="rounded-xl border border-gold/50 bg-navy-soft/40 p-5 text-center">
                  <div className="text-4xl mb-1">🎟️</div>
                  <p className="text-cream/85 text-sm leading-relaxed">
                    <strong className="text-gold-soft">Weekly {campaign.rafflePrize} raffle</strong> —
                    every family where <em>everyone</em> checks in is entered to win
                  </p>
                </div>
              )}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/signup"
                className="inline-block bg-gold text-navy-deep font-bold rounded-lg px-10 py-4 text-lg hover:bg-gold-soft transition-colors"
              >
                Join the campaign
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* breathing room above the sticky join bar */}
      <div className="h-20" />
      <JoinNudge
        checkinOpen={checkinOpen}
        checkinHref={checkinHref}
        checkinLabel={lastLabel}
        charityName={stats.charityName}
        pledge={campaign.pledgePerSignup}
      />
      <HomePopups announcement={announcement} />
      <span className="sr-only">{PLATFORM.name}</span>
    </div>
  );
}
