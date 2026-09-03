import Link from "next/link";
import { redirect } from "next/navigation";
import { currentShul, rootBaseUrl } from "@/lib/tenant";
import { listDirectoryShuls, listCities } from "@/lib/directory";
import { getNationalStats } from "@/lib/stats";
import { PLATFORM } from "@/lib/platform";
import ShulDirectory from "@/components/national/ShulDirectory";
import CitiesBoard from "@/components/national/CitiesBoard";

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
          : `${stats.members.toLocaleString()} people · ${stats.households.toLocaleString()} families · ${stats.cities} ${stats.cities === 1 ? "city" : "cities"}`}
      </p>
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
