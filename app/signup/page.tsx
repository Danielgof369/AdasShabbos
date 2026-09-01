import { prisma } from "@/lib/db";
import { campaignOf, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import { getShul } from "@/lib/tenant";
import { pluralWeeks } from "@/lib/copy";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const shul = await getShul();
  const campaign = campaignOf(shul);
  const suggestions = await prisma.suggestion.findMany({
    where: { shulId: shul.id, active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, detail: true, categories: true },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-3xl text-navy mb-2">Join the campaign</h1>
      <p className="text-ink-soft mb-8">
        Sign up your whole household — each person takes on one or more
        commitments and holds them for the {pluralWeeks(campaign.weeks)} of the campaign
        {campaign.weeks > 1 ? (
          <>
            , {formatShabbosDate(campaign, shabbosOfWeek(campaign, 1))} through{" "}
            {formatShabbosDate(campaign, shabbosOfWeek(campaign, campaign.weeks))}
          </>
        ) : (
          <> on {formatShabbosDate(campaign, shabbosOfWeek(campaign, 1))}</>
        )}{" "}
        — with the hope that they become permanent.
      </p>
      <SignupForm
        suggestions={suggestions}
        charityName={campaign.charityName}
        pledge={campaign.pledgePerSignup}
      />
    </div>
  );
}
