import Link from "next/link";
import { redirect } from "next/navigation";
import { currentShul, rootBaseUrl } from "@/lib/tenant";
import { listDirectoryShuls, listCities } from "@/lib/directory";
import { getNationalStats } from "@/lib/stats";
import { PLATFORM } from "@/lib/platform";
import ShulDirectory from "@/components/national/ShulDirectory";
import CitiesBoard, { plural } from "@/components/national/CitiesBoard";

export const dynamic = "force-dynamic";

export const metadata = { title: `Who's in | ${PLATFORM.name}` };

export default async function WhosInPage() {
  if (await currentShul()) redirect(`${rootBaseUrl()}/whos-in`);
  const [cities, shuls, stats] = await Promise.all([listCities(), listDirectoryShuls(), getNationalStats()]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl sm:text-4xl text-navy mb-2 text-center">Who&rsquo;s in</h1>
      <p className="text-ink-soft text-center mb-10">
        {stats.members === 0
          ? "Be the first."
          : `${plural(stats.members, "person", "people")} · ${plural(stats.households, "family", "families")} · ${plural(stats.cities, "city", "cities")}`}
      </p>
      {stats.highlights.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2.5 mb-10 -mt-4">
          {stats.highlights.slice(0, 6).map((h) => (
            <div key={h.label} className="bg-gold-pale rounded-full px-4 py-1.5 text-navy text-sm">
              <span className="font-display text-base text-gold mr-1.5 tabular-nums">{h.value.toLocaleString()}</span>
              {h.label}
            </div>
          ))}
        </div>
      )}
      <p className="text-ink-soft text-sm text-center mb-6">Tap a city to see the families there and what they&rsquo;ve done.</p>
      <CitiesBoard cities={cities} />
      {shuls.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display text-2xl text-navy mb-6 text-center">Community pages</h2>
          <ShulDirectory shuls={shuls} />
        </div>
      )}
      <div className="text-center mt-12 bg-white rounded-2xl border border-parchment p-8">
        <p className="font-display text-xl text-navy mb-2">Add your family</p>
        <p className="text-ink-soft mb-5">Thirty seconds. Tell us your city and, if you like, your shul.</p>
        <Link href="/join" className="inline-block bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 hover:bg-gold-soft transition-colors">
          Sign up
        </Link>
      </div>
    </div>
  );
}
