import Link from "next/link";
import { redirect } from "next/navigation";
import { currentShul, rootBaseUrl } from "@/lib/tenant";
import { listDirectoryShuls } from "@/lib/directory";
import ShulDirectory from "@/components/national/ShulDirectory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find your shul | Kabbalos Shabbos",
};

export default async function ShulsPage() {
  // The directory lives on the national site; bounce there from a shul host.
  if (await currentShul()) redirect(`${rootBaseUrl()}/shuls`);
  const shuls = await listDirectoryShuls();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl sm:text-4xl text-navy mb-2 text-center">
        Find your shul
      </h1>
      <p className="text-ink-soft text-center mb-10">
        {shuls.length} {shuls.length === 1 ? "shul is" : "shuls are"} running a campaign.
        Tap yours to sign up your family.
      </p>
      <ShulDirectory shuls={shuls} />
      <div className="text-center mt-12 bg-white rounded-2xl border border-parchment p-8">
        <p className="font-display text-xl text-navy mb-2">Your shul isn&rsquo;t here yet?</p>
        <p className="text-ink-soft mb-5">Set it up in two minutes and share the link tonight.</p>
        <Link
          href="/start"
          className="inline-block bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 hover:bg-gold-soft transition-colors"
        >
          Bring it to your shul
        </Link>
      </div>
    </div>
  );
}
