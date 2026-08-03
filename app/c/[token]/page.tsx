import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCampaign } from "@/lib/campaign";
import { getHouseholdView } from "@/lib/household";
import CheckinClient from "./CheckinClient";

export const dynamic = "force-dynamic";

export default async function HouseholdPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const campaign = await getCampaign();
  const view = await getHouseholdView(token, campaign);
  if (!view) notFound();

  const suggestions = await prisma.suggestion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, detail: true, audience: true },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-3xl text-navy mb-1">
        Your family&rsquo;s check-in
      </h1>
      <p className="text-ink-soft mb-8">
        Check in on last Shabbos, set next week&rsquo;s commitment, and keep
        the streak going.
      </p>
      <CheckinClient
        token={view.token}
        members={view.members}
        suggestions={suggestions}
        totalWeeks={campaign.weeks}
      />
    </div>
  );
}
