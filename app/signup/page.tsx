import { prisma } from "@/lib/db";
import { getCampaign, activeWeek, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const campaign = await getCampaign();
  const week = activeWeek(campaign);
  const suggestions = await prisma.suggestion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, detail: true, categories: true },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-3xl text-navy mb-2">Join the campaign</h1>
      <p className="text-ink-soft mb-8">
        Sign up your whole household — each person picks one extra thing to do
        for Shabbos {formatShabbosDate(shabbosOfWeek(campaign, week))} (week {week} of {campaign.weeks}).
      </p>
      <SignupForm suggestions={suggestions} week={week} />
    </div>
  );
}
