import { prisma } from "@/lib/db";
import { campaignOf, activeWeek, shabbosOfWeek, formatShabbosDate } from "@/lib/campaign";
import { shulBaseUrl, rootBaseUrl, familyLink, type Shul } from "@/lib/tenant";
import { sendToHousehold } from "@/lib/messaging";
import { pluralWeeks } from "@/lib/copy";

export type WelcomeOutcome = "sent" | "already" | "failed";

/**
 * The welcome email with the family's permanent link. Sent once per
 * household (logged under kind "welcome"); `force` sends it again, for
 * the admin's "resend" button. Awaited by callers so a serverless function
 * never returns before the email has actually gone out.
 */
export async function sendWelcome(
  shul: Shul,
  householdId: string,
  opts: { week?: number; force?: boolean } = {}
): Promise<WelcomeOutcome> {
  if (!opts.force) {
    const welcomed = await prisma.messageLog.findFirst({ where: { householdId, kind: "welcome" } });
    if (welcomed) return "already";
  }
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: { members: { include: { goals: { include: { suggestion: true }, orderBy: { week: "asc" } } } } },
  });
  if (!household) return "failed";

  const campaign = campaignOf(shul);
  const week = opts.week ?? activeWeek(campaign);
  const link = familyLink(shul, household.token);
  const base = shul.hasSite ? shulBaseUrl(shul) : rootBaseUrl();
  const lines = household.members
    .map((m) => ({ m, goals: m.goals.filter((g) => g.week === week) }))
    .filter((x) => x.goals.length)
    .map(({ m, goals }) => `• ${m.name}: ${goals.map((g) => g.suggestion?.title ?? g.customTitle).filter(Boolean).join(" + ")}`);
  const familyName = household.familyName ?? "Your";
  const text = [
    `Welcome to ${campaign.name}! 🕯️`,
    ``,
    `The ${familyName} family has taken on their commitments for the ${pluralWeeks(campaign.weeks)} of the campaign — starting Shabbos ${formatShabbosDate(campaign, shabbosOfWeek(campaign, week))}, through Shabbos ${formatShabbosDate(campaign, shabbosOfWeek(campaign, campaign.weeks))}:`,
    ...lines,
    ``,
    `Your family page — there's no password, this link IS your login:`,
    link,
    ``,
    `Lost the link? Tap "Sign in" at ${base.replace(/^https?:\/\//, "")} and enter this email address — that's it.`,
    ``,
    `We'll remind you before each Shabbos, and after Shabbos to check in.${campaign.pledgeEnabled ? ` Your family's signup sent $${campaign.pledgePerSignup} to ${campaign.charityName}.` : ""}`,
    ...(household.members.some((m) => m.isChild)
      ? [``, `P.S. For the children: the Shabbos Helpers Guide, full of jobs worth owning — ${base}/shabbos-helpers-guide.pdf`]
      : []),
  ].join("\n");

  const channel = await sendToHousehold(household, { subject: `Your family page — ${campaign.name}`, text }, "welcome", week);
  return channel ? "sent" : "failed";
}
