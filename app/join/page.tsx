import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { campaignOf, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import { currentShul } from "@/lib/tenant";
import { PLATFORM } from "@/lib/platform";
import { pluralWeeks } from "@/lib/copy";
import ShulPicker from "@/components/national/ShulPicker";
import { getIndividualsShul } from "@/lib/individuals";
import SignupForm from "@/app/signup/SignupForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign up your family | Kabbalos Shabbos" };

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ shul?: string; solo?: string }>;
}) {
  // On a shul's own site, signup lives at /signup.
  if (await currentShul()) redirect("/signup");
  const { shul: slug, solo } = await searchParams;

  // Signing up on your own: the catch-all shul, plus a "my shul is…" note
  // the operator uses to set the real shul up later.
  const shul = solo
    ? await getIndividualsShul()
    : slug
      ? await prisma.shul.findFirst({ where: { slug, active: true, approved: true, listed: true } })
      : null;

  if (!shul) {
    const shuls = await prisma.shul.findMany({
      where: { active: true, approved: true, listed: true },
      orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, city: true, state: true, hasSite: true },
    });
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-gold font-display tracking-widest uppercase text-sm mb-2 text-center">{PLATFORM.name}</p>
        <h1 className="font-display text-3xl text-navy mb-2 text-center">Sign up your family</h1>
        <p className="text-ink-soft text-center mb-8">
          One small thing for Shabbos, every week. Thirty seconds, no passwords.
        </p>
        <ShulPicker shuls={shuls} />
      </div>
    );
  }

  if (shul.hasSite) redirect(`https://${shul.customDomain ?? `${shul.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kabbolasshabbos.com"}`}/signup`);

  const campaign = campaignOf(shul);
  const suggestions = await prisma.suggestion.findMany({
    where: { shulId: shul.id, active: true, tier: { not: "kehilla" } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, detail: true, categories: true, tier: true },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-gold font-display tracking-widest uppercase text-sm mb-2">
        <Link href="/join" className="hover:underline">← Different shul</Link>
      </p>
      <h1 className="font-display text-3xl text-navy mb-2">{solo ? "Sign up your family" : `Join with ${shul.name}`}</h1>
      <p className="text-ink-soft mb-8">
        {solo ? "" : `${shul.city}${shul.state ? `, ${shul.state}` : ""} · `}Sign up your whole household — each person takes on one or
        more commitments and holds them for the {pluralWeeks(campaign.weeks)} of {campaign.seasonLabel}
        {campaign.weeks > 1 ? (
          <>, {formatShabbosDate(campaign, shabbosOfWeek(campaign, 1))} through {formatShabbosDate(campaign, shabbosOfWeek(campaign, campaign.weeks))}</>
        ) : (
          <> on {formatShabbosDate(campaign, shabbosOfWeek(campaign, 1))}</>
        )}
        {solo ? (
          <>. Tell us your shul below and we&rsquo;ll set up its page; your family moves onto it automatically.</>
        ) : (
          <>. Your family shows up on <Link href={`/s/${shul.slug}`} className="underline">the {shul.name} page</Link>.</>
        )}
      </p>
      <SignupForm
        suggestions={suggestions}
        charityName={campaign.charityName}
        pledge={campaign.pledgePerSignup}
        shulId={shul.id}
        askShul={!!solo}
        defaultShulNote={solo && slug ? slug : ""}
        askCity
        defaultCity={solo ? "" : shul.city}
      />
    </div>
  );
}
