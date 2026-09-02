import { redirect } from "next/navigation";
import { currentShul, rootBaseUrl, ROOT_DOMAIN } from "@/lib/tenant";
import { PLATFORM, TIMEZONES } from "@/lib/platform";
import StartForm from "./StartForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bring it to your shul | Kabbolas Shabbos",
};

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  // Onboarding lives on the national site; bounce there from a shul host.
  if (await currentShul()) redirect(`${rootBaseUrl()}/start`);
  const { slug } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-gold font-display tracking-widest uppercase text-sm mb-3 text-center">
        {PLATFORM.name}
      </p>
      <h1 className="font-display text-3xl sm:text-4xl text-navy mb-3 text-center">
        Bring it to your shul
      </h1>
      <p className="text-ink-soft text-center mb-10 max-w-lg mx-auto">
        Two minutes, and your shul has its own campaign site with reminders,
        check-ins, a raffle and a live count — free. You can change everything
        later from your admin page.
      </p>
      <StartForm
        rootDomain={ROOT_DOMAIN}
        timezones={TIMEZONES}
        initialSlug={slug ?? ""}
        defaultSeason={PLATFORM.origin.season}
        defaultCampaignName={PLATFORM.name}
      />
    </div>
  );
}
