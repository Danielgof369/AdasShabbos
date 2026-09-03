import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { campaignOf, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import { currentShul } from "@/lib/tenant";
import { PLATFORM } from "@/lib/platform";
import { pluralWeeks } from "@/lib/copy";
import { ALL_CITIES } from "@/lib/cities";
import { getIndividualsShul } from "@/lib/individuals";
import SignupForm from "@/app/signup/SignupForm";

export const dynamic = "force-dynamic";

export const metadata = { title: `Sign up | ${PLATFORM.name}` };

/**
 * The one national signup: individuals and families, with an optional
 * "your shul" note and a city. Everyone lands on the catch-all shul; the
 * operator creates real shul pages from the notes at /platform.
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ shul?: string; city?: string }>;
}) {
  // On a shul's own site, signup lives at /signup.
  if (await currentShul()) redirect("/signup");
  const { shul: prefill, city: cityPrefill } = await searchParams;

  const shul = await getIndividualsShul();
  const campaign = campaignOf(shul);
  const suggestions = await prisma.suggestion.findMany({
    where: { shulId: shul.id, active: true, tier: { not: "kehilla" } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, detail: true, categories: true, tier: true },
  });
  const first = formatShabbosDate(campaign, shabbosOfWeek(campaign, 1));
  const last = formatShabbosDate(campaign, shabbosOfWeek(campaign, campaign.weeks));

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-gold font-display tracking-widest uppercase text-sm mb-2">
        <Link href="/" className="hover:underline">← {PLATFORM.name}</Link>
      </p>
      <h1 className="font-display text-3xl text-navy mb-2">Sign up your family</h1>
      <p className="text-ink-soft mb-8">
        Sign up on your own or with your whole household — each person takes on one or more
        commitments and holds them for the {pluralWeeks(campaign.weeks)} of {campaign.seasonLabel}
        {campaign.weeks > 1 ? <>, {first} through {last}</> : <> on {first}</>}. Tell us your city and
        your shul below, and your family shows up on your shul&rsquo;s page once it&rsquo;s set up.
      </p>
      <SignupForm
        suggestions={suggestions}
        charityName={campaign.charityName}
        pledge={campaign.pledgePerSignup}
        shulId={shul.id}
        askShul
        defaultShulNote={prefill ?? ""}
        askCity
        defaultCity={cityPrefill && ALL_CITIES.has(cityPrefill) ? cityPrefill : ""}
      />
    </div>
  );
}
