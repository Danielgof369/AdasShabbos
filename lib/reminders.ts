import { prisma } from "@/lib/db";
import {
  getCampaign,
  shabbosOfWeek,
  formatShabbosDate,
} from "@/lib/campaign";
import { lastShabbosWeek, nextShabbosWeek, goalTitle } from "@/lib/household";
import { sendToHousehold } from "@/lib/messaging";

function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type ReminderRunResult = {
  week: number;
  sent: number;
  skipped: number;
  details: string[];
};

/**
 * Thursday reminder: tells each household what everyone committed to for the
 * upcoming Shabbos, and nudges anyone who hasn't set a goal yet.
 */
export async function runThursdayReminders(): Promise<ReminderRunResult> {
  const campaign = await getCampaign();
  const week = nextShabbosWeek(campaign);
  if (week > campaign.weeks) {
    return { week, sent: 0, skipped: 0, details: ["Campaign is over — nothing to send."] };
  }
  const shabbosLabel = formatShabbosDate(shabbosOfWeek(campaign, week));

  const households = await prisma.household.findMany({
    include: { members: { include: { goals: { include: { suggestion: true } } } } },
  });

  let sent = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const h of households) {
    if (h.members.length === 0) continue;

    const already = await prisma.messageLog.findFirst({
      where: { householdId: h.id, kind: "thursday_reminder", week },
    });
    if (already) {
      skipped++;
      continue;
    }

    const withGoal = h.members
      .map((m) => ({ m, goals: m.goals.filter((g) => g.week === week) }))
      .filter((x) => x.goals.length > 0);
    const withoutGoal = h.members.filter((m) => !m.goals.some((g) => g.week === week));

    const link = `${baseUrl()}/c/${h.token}`;
    const lines: string[] = [];
    lines.push(`🕯️ Shabbos is coming — ${shabbosLabel}! Week ${week} of ${campaign.weeks} of the Elul Shabbos Project.`);
    if (withGoal.length > 0) {
      lines.push("");
      for (const { m, goals } of withGoal) {
        lines.push(`• ${m.name}: ${goals.map((g) => goalTitle(g)).join(" + ")}`);
      }
    }
    if (withoutGoal.length > 0) {
      lines.push("");
      lines.push(
        `${withoutGoal.map((m) => m.name).join(" & ")} ${withoutGoal.length === 1 ? "hasn't" : "haven't"} set commitments yet — tap to choose: ${link}`
      );
    } else {
      lines.push("");
      lines.push(`You've got this! Your page: ${link}`);
    }

    const channel = await sendToHousehold(
      h,
      { subject: `Shabbos is coming — week ${week} of the Elul Shabbos Project`, text: lines.join("\n") },
      "thursday_reminder",
      week
    );
    if (channel) {
      sent++;
      details.push(`household ${h.id} via ${channel}`);
    }
  }

  return { week, sent, skipped, details };
}

/**
 * Motzei Shabbos / Sunday reminder: asks households to check in on the week
 * that just ended (and set next week's commitment).
 */
export async function runCheckinReminders(): Promise<ReminderRunResult> {
  const campaign = await getCampaign();
  const week = lastShabbosWeek(campaign);
  if (week < 1) {
    return { week, sent: 0, skipped: 0, details: ["No Shabbos has passed yet."] };
  }

  const households = await prisma.household.findMany({
    include: { members: { include: { goals: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const h of households) {
    const pending = h.members.filter((m) =>
      m.goals.some((g) => g.week === week && !g.checkedInAt)
    );
    if (pending.length === 0) continue;

    const already = await prisma.messageLog.findFirst({
      where: { householdId: h.id, kind: "checkin_reminder", week },
    });
    if (already) {
      skipped++;
      continue;
    }

    const link = `${baseUrl()}/c/${h.token}`;
    const names = pending.map((m) => m.name).join(" & ");
    const isLastWeek = week >= campaign.weeks;
    const text = [
      `✨ Gut voch! How did week ${week} go?`,
      `Check in for ${names} — every check-in sends another $1 to ${campaign.charityName}.`,
      isLastWeek ? "" : `Your commitment carries into next Shabbos too — keep it going!`,
      link,
    ]
      .filter(Boolean)
      .join("\n");

    const channel = await sendToHousehold(
      h,
      { subject: `How did Shabbos go? Check in — week ${week}`, text },
      "checkin_reminder",
      week
    );
    if (channel) {
      sent++;
      details.push(`household ${h.id} via ${channel}`);
    }
  }

  return { week, sent, skipped, details };
}
