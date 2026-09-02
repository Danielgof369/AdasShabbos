import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { campaignOf, activeWeek, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import { currentShul, rootBaseUrl, shulBaseUrl } from "@/lib/tenant";
import { getCampaignStats } from "@/lib/stats";
import { familyStreakFromGoals } from "@/lib/household";
import { memberCategory } from "@/lib/categories";
import { PLATFORM, TIERS } from "@/lib/platform";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shul = await prisma.shul.findUnique({ where: { slug }, select: { name: true, city: true } });
  return { title: shul ? `${shul.name} | ${PLATFORM.name}` : PLATFORM.name };
}

/** A shul's page on the national site: who's there, what they've done. */
export default async function ShulPage({ params }: { params: Promise<{ slug: string }> }) {
  if (await currentShul()) redirect(`${rootBaseUrl()}/s/${(await params).slug}`);
  const { slug } = await params;
  const shul = await prisma.shul.findUnique({ where: { slug } });
  if (!shul || !shul.active || !shul.approved) notFound();

  const campaign = campaignOf(shul);
  const week = activeWeek(campaign);
  const [stats, households, kehilla] = await Promise.all([
    getCampaignStats(campaign, week),
    prisma.household.findMany({
      where: { shulId: shul.id, familyName: { not: null } },
      include: { members: { include: { goals: { select: { week: true, checkedInAt: true } } } } },
    }),
    prisma.suggestion.findMany({
      where: { shulId: shul.id, tier: "kehilla" },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const families = households
    .filter((h) => h.members.length > 0)
    .map((h) => ({
      id: h.id,
      name: h.familyName as string,
      categories: h.members.map((m) => ({ category: memberCategory(m), avatar: m.avatar, seed: m.id })),
      people: h.members.length,
      streak: familyStreakFromGoals(campaign, h.members),
    }))
    .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));
  const takenOn = kehilla.filter((k) => k.active);
  const joinHref = shul.hasSite ? `${shulBaseUrl(shul)}/signup` : `/join?shul=${encodeURIComponent(shul.slug)}`;

  return (
    <div>
      <section className="bg-navy text-cream relative overflow-hidden">
        <div className="glow-dot absolute -top-24 right-0 h-96 w-96 rounded-full" />
        <div className="mx-auto max-w-4xl px-4 py-14 relative">
          <p className="text-gold-soft font-display tracking-widest uppercase text-sm mb-3">
            <Link href="/shuls" className="hover:underline">All shuls</Link> &middot; {campaign.seasonLabel}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-2">{shul.name}</h1>
          <p className="text-cream/75 text-lg mb-8">
            {shul.city}{shul.state ? `, ${shul.state}` : ""}
            {shul.partnerName ? ` · with ${shul.partnerName}` : ""}
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-lg mb-8">
            {[
              [stats.households, stats.households === 1 ? "family" : "families"],
              [stats.members, "people"],
              [stats.checkins, "check-ins"],
            ].map(([v, l]) => (
              <div key={String(l)} className="bg-white/10 rounded-xl border border-cream/15 px-3 py-4 text-center">
                <div className="font-display text-3xl text-gold-soft">{v}</div>
                <div className="text-cream/75 text-sm">{l}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={joinHref} className="bg-gold text-navy-deep font-bold rounded-lg px-8 py-3.5 text-center text-lg hover:bg-gold-soft transition-colors">
              Sign up with {shul.name}
            </a>
            {shul.hasSite && (
              <a href={shulBaseUrl(shul)} className="border border-cream/40 rounded-lg px-8 py-3.5 text-center text-lg hover:border-gold-soft hover:text-gold-soft transition-colors">
                Their site →
              </a>
            )}
          </div>
          <p className="mt-5 text-cream/60 text-sm">
            Week {week} of {campaign.weeks} &middot; Shabbos {formatShabbosDate(campaign, shabbosOfWeek(campaign, week))}
          </p>
        </div>
      </section>

      {stats.highlights.length > 0 && (
        <section className="bg-gold-pale border-b border-gold/30">
          <div className="mx-auto max-w-4xl px-4 py-6 flex flex-wrap justify-center gap-3">
            {stats.highlights.slice(0, 6).map((h) => (
              <div key={h.label} className="bg-white/70 rounded-full px-5 py-2 text-navy text-sm">
                <span className="font-display text-lg text-gold mr-2">{h.value.toLocaleString()}</span>
                {h.label}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="font-display text-3xl text-navy mb-2 text-center">Who&rsquo;s here</h2>
        <p className="text-ink-soft text-center mb-8">
          {families.length === 0
            ? "Be the first family from this shul."
            : `${families.length} ${families.length === 1 ? "family" : "families"}, each holding their commitments for the whole campaign.`}
        </p>
        {families.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {families.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl border border-parchment shadow-sm px-5 py-4">
                <div className="flex -space-x-2 mb-2">
                  {f.categories.slice(0, 6).map((c, i) => (
                    <Avatar key={i} category={c.category} avatar={c.avatar} seed={c.seed} className="h-11 w-auto" title />
                  ))}
                  {f.categories.length > 6 && <span className="self-end text-xs text-ink-soft pl-2">+{f.categories.length - 6}</span>}
                </div>
                <div className="font-display text-lg text-navy">The {f.name} Family</div>
                {f.streak > 0 ? (
                  <span className="inline-block text-xs bg-gold-pale text-navy-deep rounded-full px-2.5 py-0.5 mt-1 font-medium">🔥 {f.streak}-week streak</span>
                ) : (
                  <span className="text-xs text-ink-soft">signed up ✓</span>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <a href={joinHref} className="inline-block bg-navy text-cream font-semibold rounded-lg px-8 py-3.5 hover:bg-navy-soft transition-colors">
            Add your family
          </a>
        </div>
      </section>

      {kehilla.length > 0 && (
        <section className="bg-parchment/60">
          <div className="mx-auto max-w-4xl px-4 py-12">
            <h2 className="font-display text-3xl text-navy mb-2 text-center">{TIERS[2].title}</h2>
            <p className="text-ink-soft text-center mb-8">
              {takenOn.length > 0
                ? `${shul.name} has taken on ${takenOn.length} kehilla ${takenOn.length === 1 ? "kabbolah" : "kabbolos"} as a shul.`
                : `Kabbolos a shul takes on together, led by the rav. Ask your rav which ones ${shul.name} will take on — and tell us at ${PLATFORM.contactEmail}.`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kehilla.map((k) => (
                <div key={k.id} className={`rounded-xl border px-5 py-4 ${k.active ? "bg-white border-gold shadow-sm" : "bg-white/60 border-parchment"}`}>
                  <h4 className={`font-semibold ${k.active ? "text-navy" : "text-ink-soft"}`}>{k.active ? "✓ " : ""}{k.title}</h4>
                  {k.detail && <p className="text-ink-soft text-sm mt-1">{k.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
