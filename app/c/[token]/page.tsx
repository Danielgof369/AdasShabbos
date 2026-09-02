import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { campaignOf } from "@/lib/campaign";
import { currentShul, unknownSubdomain, type Shul } from "@/lib/tenant";
import Link from "next/link";
import PendingApproval from "@/components/PendingApproval";
import { getHouseholdView } from "@/lib/household";
import { isAdmin } from "@/lib/adminAuth";
import CheckinClient from "./CheckinClient";

export const dynamic = "force-dynamic";

export default async function HouseholdPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken).toLowerCase();
  let shul: Shul | null = await currentShul();
  const national = !shul;
  if (!shul) {
    if (await unknownSubdomain()) notFound();
    // National site: the family's link is unique across national shuls.
    const hh = await prisma.household.findFirst({
      where: { token, shul: { hasSite: false, active: true } },
      include: { shul: true },
    });
    if (!hh) notFound();
    shul = hh.shul;
  }
  if (!shul.approved && !(await isAdmin(shul))) return <PendingApproval shul={shul} />;
  const campaign = campaignOf(shul);
  const view =
    (await getHouseholdView(rawToken, campaign)) ?? (await getHouseholdView(token, campaign));
  if (!view) notFound();
  const viewerIsAdmin = await isAdmin(shul);

  const suggestions = await prisma.suggestion.findMany({
    where: { shulId: shul.id, active: true, tier: { not: "kehilla" } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, detail: true, categories: true, tier: true },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-3xl text-navy mb-1">
        {view.familyName ? `The ${view.familyName} Family` : "Your family's check-in"}
      </h1>
      {national && (
        <p className="text-sm text-gold font-semibold mb-1">
          <Link href={`/s/${shul.slug}`} className="hover:underline">{shul.name}</Link>
          {shul.city ? <span className="text-ink-soft font-normal"> · {shul.city}</span> : null}
        </p>
      )}
      <p className="text-ink-soft mb-2">
        Check in on last Shabbos, set next week&rsquo;s commitment, and keep
        the streak going.
      </p>
      {view.streak > 0 && (
        <p className="inline-block bg-gold-pale text-navy-deep text-sm font-medium rounded-full px-4 py-1.5 mb-6">
          🔥 Family streak: {view.streak} {view.streak === 1 ? "week" : "weeks"} strong
        </p>
      )}
      {view.streak === 0 && <div className="mb-6" />}
      <CheckinClient
        token={view.token}
        members={view.members}
        suggestions={suggestions}
        totalWeeks={campaign.weeks}
        viewerIsAdmin={viewerIsAdmin}
      />
    </div>
  );
}
