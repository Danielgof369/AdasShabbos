import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { campaignOf, activeWeek, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import { currentShul, rootBaseUrl } from "@/lib/tenant";
import { findCity } from "@/lib/directory";
import { getIndividualsShul } from "@/lib/individuals";
import { familyStreakFromGoals, goalTitle } from "@/lib/household";
import { memberCategory } from "@/lib/categories";
import { PLATFORM } from "@/lib/platform";
import Avatar from "@/components/Avatar";
import { plural } from "@/components/national/CitiesBoard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const city = await findCity((await params).city);
  return { title: city ? `${city.city} | ${PLATFORM.name}` : PLATFORM.name };
}

/** One city on the national board: who's in, what they've taken on, what they've done. */
export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  if (await currentShul()) redirect(`${rootBaseUrl()}/whos-in/${slug}`);
  const city = await findCity(slug);
  if (!city) notFound();

  const seasonShul = await getIndividualsShul();
  const campaign = campaignOf(seasonShul);
  const week = activeWeek(campaign);

  // Every family whose city matches, or whose listed shul sits there.
  const households = await prisma.household.findMany({
    where: {
      shul: { active: true, approved: true },
      OR: [
        { city: { in: city.variants } },
        { city: null, shul: { listed: true, city: { in: city.variants } } },
      ],
      members: { some: {} },
    },
    include: {
      shul: { select: { listed: true, name: true } },
      members: { include: { goals: { select: { week: true, checkedInAt: true, customTitle: true, suggestion: { select: { title: true } } } } } },
    },
  });
  const families = households
    .map((h) => ({
      id: h.id,
      name: h.familyName?.trim() || null,
      shul: h.shulNote?.trim() || (h.shul.listed ? h.shul.name : null),
      people: h.members.map((m) => ({ category: memberCategory(m), avatar: m.avatar, seed: m.id })),
      streak: familyStreakFromGoals(campaign, h.members),
      thisWeek: h.members.flatMap((m) => m.goals.filter((g) => g.week === week).map(goalTitle)),
    }))
    .sort((a, b) => b.streak - a.streak || (a.name ?? "").localeCompare(b.name ?? ""));

  // What this city is taking on this Shabbos, by distinct person.
  const byTitle = new Map<string, number>();
  for (const f of families) for (const t of f.thisWeek) byTitle.set(t, (byTitle.get(t) ?? 0) + 1);
  const takenOn = [...byTitle.entries()].map(([title, people]) => ({ title, people })).sort((a, b) => b.people - a.people).slice(0, 8);

  const shuls = [...new Set(families.map((f) => f.shul).filter((s): s is string => !!s))].sort();

  return (
    <div>
      <section className="bg-navy text-cream relative overflow-hidden">
        <div className="glow-dot absolute -top-24 right-0 h-96 w-96 rounded-full" />
        <div className="mx-auto max-w-4xl px-4 py-14 relative">
          <p className="text-gold-soft font-display tracking-widest uppercase text-sm mb-3">
            <Link href="/whos-in" className="hover:underline">Who&rsquo;s in</Link> &middot; {campaign.seasonLabel}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-2">{city.city}</h1>
          {city.region && <p className="text-cream/75 text-lg mb-8">{city.region}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mb-8">
            {[
              [city.families, city.families === 1 ? "family" : "families"],
              [city.people, city.people === 1 ? "person" : "people"],
              [city.children, "children"],
              [city.checkins, "check-ins"],
            ].map(([v, l]) => (
              <div key={String(l)} className="bg-white/10 rounded-xl border border-cream/15 px-3 py-4 text-center">
                <div className="font-display text-3xl text-gold-soft tabular-nums">{Number(v).toLocaleString()}</div>
                <div className="text-cream/75 text-sm">{l}</div>
              </div>
            ))}
          </div>
          <Link href={`/join?city=${encodeURIComponent(city.city)}`} className="inline-block bg-gold text-navy-deep font-bold rounded-lg px-8 py-3.5 text-center text-lg hover:bg-gold-soft transition-colors">
            Sign up from {city.city}
          </Link>
          <p className="mt-5 text-cream/60 text-sm">
            Week {week} of {campaign.weeks} &middot; Shabbos {formatShabbosDate(campaign, shabbosOfWeek(campaign, week))}
          </p>
        </div>
      </section>

      <section className="bg-gold-pale border-b border-gold/30">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <p className="text-center text-navy-deep font-display text-lg mb-3">What {city.city} has done so far</p>
          {city.highlights.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-3">
              {city.highlights.slice(0, 8).map((h) => (
                <div key={h.label} className="bg-white/70 rounded-full px-5 py-2 text-navy text-sm">
                  <span className="font-display text-lg text-gold mr-2 tabular-nums">{h.value.toLocaleString()}</span>
                  {h.label}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-navy/70 text-sm">The counters start after the first Shabbos check-in.</p>
          )}
        </div>
      </section>

      {takenOn.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pt-12">
          <h2 className="font-display text-2xl text-navy mb-1 text-center">Taking on this Shabbos</h2>
          <p className="text-ink-soft text-center mb-6 text-sm">Week {week} &middot; {plural(city.people, "person", "people")} in {city.city}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {takenOn.map((t) => (
              <div key={t.title} className="flex items-center justify-between gap-4 bg-white rounded-xl border border-parchment px-5 py-3.5">
                <span className="text-navy">{t.title}</span>
                <span className="shrink-0 text-right">
                  <span className="font-display text-xl text-gold tabular-nums">{t.people}</span>
                  <span className="text-xs text-ink-soft ml-1">{t.people === 1 ? "person" : "people"}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="font-display text-3xl text-navy mb-2 text-center">Who&rsquo;s here</h2>
        <p className="text-ink-soft text-center mb-2">
          {plural(families.length, "family", "families")} from {city.city}
          {shuls.length > 0 ? ` · ${plural(shuls.length, "shul", "shuls")}` : ""}
        </p>
        {shuls.length > 0 && (
          <p className="text-xs text-ink-soft text-center mb-8 max-w-2xl mx-auto">{shuls.join(" · ")}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {families.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-parchment shadow-sm px-5 py-4">
              <div className="flex -space-x-2 mb-2">
                {f.people.slice(0, 6).map((c, i) => (
                  <Avatar key={i} category={c.category} avatar={c.avatar} seed={c.seed} className="h-11 w-auto" title />
                ))}
                {f.people.length > 6 && <span className="self-end text-xs text-ink-soft pl-2">+{f.people.length - 6}</span>}
              </div>
              <div className="font-display text-lg text-navy">{f.name ? `The ${f.name} Family` : `A family of ${f.people.length}`}</div>
              {f.shul && <div className="text-xs text-ink-soft truncate" title={f.shul}>{f.shul}</div>}
              {f.streak > 0 ? (
                <span className="inline-block text-xs bg-gold-pale text-navy-deep rounded-full px-2.5 py-0.5 mt-1.5 font-medium">🔥 {f.streak}-week streak</span>
              ) : (
                <span className="inline-block text-xs text-ink-soft mt-1.5">signed up ✓</span>
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href={`/join?city=${encodeURIComponent(city.city)}`} className="inline-block bg-navy text-cream font-semibold rounded-lg px-8 py-3.5 hover:bg-navy-soft transition-colors">
            Add your family in {city.city}
          </Link>
        </div>
      </section>
    </div>
  );
}
