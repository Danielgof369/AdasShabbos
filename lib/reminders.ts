import { prisma } from "@/lib/db";
import {
  campaignOf,
  shabbosOfWeek,
  formatShabbosDate,
  type CampaignInfo,
} from "@/lib/campaign";
import { shulBaseUrl, type Shul } from "@/lib/tenant";
import { lastShabbosWeek, nextShabbosWeek, goalTitle } from "@/lib/household";
import { sendBatch, type OutboundItem } from "@/lib/messaging";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReminderRunResult = {
  week: number;
  sent: number;
  skipped: number;
  details: string[];
};

/** Run a per-shul job across every active shul (cron entrypoints). */
const CRON_BUDGET_MS = Number(process.env.CRON_BUDGET_MS ?? 240_000);

async function forEachShul(
  job: (shul: Shul) => Promise<ReminderRunResult>
): Promise<ReminderRunResult> {
  const started = Date.now();
  const shuls = await prisma.shul.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });
  const agg: ReminderRunResult = { week: 0, sent: 0, skipped: 0, details: [] };
  for (const shul of shuls) {
    // Stay inside the function's time limit; dedupe means the next run
    // (or an admin button press) picks up whoever was left.
    if (Date.now() - started > CRON_BUDGET_MS) {
      agg.details.push(`[${shul.slug}] deferred: time budget reached`);
      continue;
    }
    try {
      const r = await job(shul);
      agg.week = r.week;
      agg.sent += r.sent;
      agg.skipped += r.skipped;
      agg.details.push(`[${shul.slug}] w${r.week}: sent ${r.sent}, skipped ${r.skipped}`);
      agg.details.push(...r.details.map((d) => `[${shul.slug}] ${d}`));
    } catch (e) {
      agg.details.push(`[${shul.slug}] FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }
  return agg;
}

/**
 * Thursday reminder for one shul: what everyone committed to for the
 * upcoming Shabbos, plus a nudge for still-open check-ins from last week.
 */
export async function runThursdayForShul(shul: Shul): Promise<ReminderRunResult> {
  const campaign = campaignOf(shul);
  const week = nextShabbosWeek(campaign);
  if (week > campaign.weeks) {
    return { week, sent: 0, skipped: 0, details: ["Campaign is over — nothing to send."] };
  }
  const shabbosLabel = formatShabbosDate(campaign, shabbosOfWeek(campaign, week));

  const households = await prisma.household.findMany({
    where: { shulId: shul.id },
    include: { members: { include: { goals: { include: { suggestion: true } } } } },
  });

  let sent = 0;
  let skipped = 0;
  const details: string[] = [];

  const alreadySent = new Set(
    (
      await prisma.messageLog.findMany({
        where: { kind: "thursday_reminder", week, householdId: { in: households.map((h) => h.id) } },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  const targets = households.filter((h) => {
    if (h.members.length === 0) return false;
    if (alreadySent.has(h.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  const outbox: OutboundItem[] = [];
  for (const h of targets) {
    const withGoal = h.members
      .map((m) => ({ m, goals: m.goals.filter((g) => g.week === week) }))
      .filter((x) => x.goals.length > 0);
    const withoutGoal = h.members.filter((m) => !m.goals.some((g) => g.week === week));

    // Still-open check-ins from last Shabbos get one more nudge here.
    const prevWeek = week - 1;
    const prevUnchecked =
      prevWeek >= 1 &&
      Date.now() - shabbosOfWeek(campaign, prevWeek).getTime() <= 8 * DAY_MS &&
      h.members.some((m) => m.goals.some((g) => g.week === prevWeek && !g.checkedInAt));

    const link = `${shulBaseUrl(shul)}/c/${h.token}`;
    const lines: string[] = [];
    lines.push(`🕯️ Shabbos is coming — ${shabbosLabel}! Week ${week} of ${campaign.weeks} of ${campaign.name}.`);
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
    if (prevUnchecked) {
      lines.push("");
      lines.push(
        `P.S. Your family still has check-ins waiting from last Shabbos — it's not too late, they still count: ${link}`
      );
    }

    outbox.push({ household: h, message: { subject: `Shabbos is coming — week ${week} of ${campaign.name}`, text: lines.join("\n") }, kind: "thursday_reminder", week });
  }
  for (const [id, channel] of await sendBatch(outbox)) {
    sent++;
    details.push(`household ${id} via ${channel}`);
  }

  return { week, sent, skipped, details };
}

/**
 * Check-in chaser for one shul. Families that haven't checked in hear from
 * us every ~2 days (Sunday, Tuesday, and the Thursday email's P.S.) until
 * the late window closes; each wave dedupes under its own log kind.
 */
export async function runCheckinForShul(shul: Shul): Promise<ReminderRunResult> {
  const campaign = campaignOf(shul);
  const week = lastShabbosWeek(campaign);
  if (week < 1) {
    return { week, sent: 0, skipped: 0, details: ["No Shabbos has passed yet."] };
  }

  const daysSince = Math.floor(
    (Date.now() - shabbosOfWeek(campaign, week).getTime()) / DAY_MS
  );
  if (daysSince > 8) {
    return { week, sent: 0, skipped: 0, details: ["Check-in window has closed."] };
  }
  const wave = daysSince <= 2 ? 1 : daysSince <= 4 ? 2 : 3;
  const kind = wave === 1 ? "checkin_reminder" : `checkin_reminder${wave}`;

  const households = await prisma.household.findMany({
    where: { shulId: shul.id },
    include: { members: { include: { goals: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const details: string[] = [`wave ${wave} (day ${daysSince} after Shabbos)`];

  const alreadySent = new Set(
    (
      await prisma.messageLog.findMany({
        where: { kind, week, householdId: { in: households.map((h) => h.id) } },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  const targets = households.filter((h) => {
    const pending = h.members.some((m) =>
      m.goals.some((g) => g.week === week && !g.checkedInAt)
    );
    if (!pending) return false;
    if (alreadySent.has(h.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  const outbox: OutboundItem[] = [];
  for (const h of targets) {
    const pending = h.members.filter((m) =>
      m.goals.some((g) => g.week === week && !g.checkedInAt)
    );
    const link = `${shulBaseUrl(shul)}/c/${h.token}`;
    const names = pending.map((m) => m.name).join(" & ");
    const isLastWeek = week >= campaign.weeks;
    const text =
      wave === 1
        ? [
            `✨ Gut voch! How did week ${week} go?`,
            `Check in for ${names} — every check-in grows your streak and the whole shul's numbers.`,
            isLastWeek ? "" : `Your commitment carries into next Shabbos too — keep it going!`,
            link,
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `👋 Quick nudge — ${names} ${pending.length === 1 ? "hasn't" : "haven't"} checked in yet for Shabbos week ${week}.`,
            `It takes 10 seconds, and late check-ins still count toward the shul-wide totals:`,
            link,
          ].join("\n");
    const subject =
      wave === 1
        ? `How did Shabbos go? Check in — week ${week}`
        : `Still time to check in — week ${week} of ${campaign.name}`;

    outbox.push({ household: h, message: { subject, text }, kind: kind, week });
  }
  for (const [id, channel] of await sendBatch(outbox)) {
    sent++;
    details.push(`household ${id} via ${channel}`);
  }

  return { week, sent, skipped, details };
}

/**
 * One-off deadline nudge (e.g. pizza-raffle cutoff) for one shul: only
 * households still missing a check-in for the most recent Shabbos.
 */
export async function runRaffleDeadlineForShul(
  shul: Shul,
  deadlineText: string
): Promise<ReminderRunResult> {
  const campaign = campaignOf(shul);
  const week = lastShabbosWeek(campaign);
  if (week < 1) {
    return { week, sent: 0, skipped: 0, details: ["No Shabbos has passed yet."] };
  }

  const kind = "raffle_deadline_reminder";
  const households = await prisma.household.findMany({
    where: { shulId: shul.id },
    include: { members: { include: { goals: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const details: string[] = [];

  const alreadySent = new Set(
    (
      await prisma.messageLog.findMany({
        where: { kind, week, householdId: { in: households.map((h) => h.id) } },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  const targets = households.filter((h) => {
    const pending = h.members.some((m) =>
      m.goals.some((g) => g.week === week && !g.checkedInAt)
    );
    if (!pending) return false;
    if (alreadySent.has(h.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  const outbox: OutboundItem[] = [];
  for (const h of targets) {
    const pending = h.members.filter((m) =>
      m.goals.some((g) => g.week === week && !g.checkedInAt)
    );
    const link = `${shulBaseUrl(shul)}/c/${h.token}`;
    const names = pending.map((m) => m.name).join(" & ");
    const text = [
      `Don't forget to check in!`,
      `${names} ${pending.length === 1 ? "hasn't" : "haven't"} checked in yet for Shabbos week ${week}.`,
      deadlineText,
      ``,
      `Check in here — it takes 10 seconds: ${link}`,
    ].join("\n");

    outbox.push({ household: h, message: { subject: `Don't forget to check in — ${campaign.raffleEnabled ? `${campaign.rafflePrize} raffle deadline` : "there's still time"}`, text }, kind: kind, week });
  }
  for (const [id, channel] of await sendBatch(outbox)) {
    sent++;
    details.push(`household ${id} via ${channel}`);
  }

  return { week, sent, skipped, details };
}

/**
 * Same-day Erev Shabbos nudge: a warm "good Shabbos, don't forget what you
 * took on" reminder, sent to every household regardless of check-in status
 * (this isn't a chase — it's a blessing). Lists each person's commitment
 * for the imminent Shabbos same as the Thursday email. Own log kind, so
 * pressing the button again only fills in anyone the first pass missed.
 */
export async function runErevShabbosForShul(shul: Shul): Promise<ReminderRunResult> {
  const campaign = campaignOf(shul);
  const week = nextShabbosWeek(campaign);
  if (week > campaign.weeks) {
    return { week, sent: 0, skipped: 0, details: ["Campaign is over — nothing to send."] };
  }
  const shabbosLabel = formatShabbosDate(campaign, shabbosOfWeek(campaign, week));

  const kind = "erev_shabbos_nudge";
  const households = await prisma.household.findMany({
    where: { shulId: shul.id },
    include: { members: { include: { goals: { include: { suggestion: true } } } } },
  });

  let sent = 0;
  let skipped = 0;
  const details: string[] = [];

  const alreadySent = new Set(
    (
      await prisma.messageLog.findMany({
        where: { kind, week, householdId: { in: households.map((h) => h.id) } },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  const targets = households.filter((h) => {
    if (h.members.length === 0) return false;
    if (alreadySent.has(h.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  const outbox: OutboundItem[] = [];
  for (const h of targets) {
    const withGoal = h.members
      .map((m) => ({ m, goals: m.goals.filter((g) => g.week === week) }))
      .filter((x) => x.goals.length > 0);
    const withoutGoal = h.members.filter((m) => !m.goals.some((g) => g.week === week));

    const link = `${shulBaseUrl(shul)}/c/${h.token}`;
    const lines: string[] = [`🕯️ Good Erev Shabbos!`];
    if (withGoal.length > 0) {
      lines.push("");
      lines.push(`Don't forget what you took on for Shabbos ${shabbosLabel}:`);
      for (const { m, goals } of withGoal) {
        lines.push(`• ${m.name}: ${goals.map((g) => goalTitle(g)).join(" + ")}`);
      }
    }
    if (withoutGoal.length > 0) {
      lines.push("");
      lines.push(
        `${withoutGoal.map((m) => m.name).join(" & ")} ${withoutGoal.length === 1 ? "hasn't" : "haven't"} picked a commitment yet — still time: ${link}`
      );
    }
    lines.push("");
    lines.push(`Wishing you and your family a beautiful, meaningful Shabbos! ${link}`);

    outbox.push({ household: h, message: { subject: `Good Erev Shabbos! 🕯️`, text: lines.join("\n") }, kind: kind, week });
  }
  for (const [id, channel] of await sendBatch(outbox)) {
    sent++;
    details.push(`household ${id} via ${channel}`);
  }

  return { week, sent, skipped, details };
}

// ---------- cron entrypoints: every active shul ----------
export async function runThursdayReminders(): Promise<ReminderRunResult> {
  return forEachShul(runThursdayForShul);
}

export async function runCheckinReminders(): Promise<ReminderRunResult> {
  return forEachShul(runCheckinForShul);
}

/**
 * A one-off message written by the shul's admin, sent to every household
 * (or only those with an open check-in). `{link}` and `{family}` in the
 * text are filled in per household. Each send gets its own log kind so a
 * second press with the same text only reaches anyone missed.
 */
export async function runCustomBlastForShul(
  shul: Shul,
  subject: string,
  text: string,
  audience: "all" | "unchecked"
): Promise<ReminderRunResult> {
  const campaign = campaignOf(shul);
  const week = Math.max(1, lastShabbosWeek(campaign));
  const kind = `custom_${Buffer.from(subject + text).toString("base64url").slice(0, 24)}`;

  const households = await prisma.household.findMany({
    where: { shulId: shul.id },
    include: { members: { include: { goals: true } } },
  });
  const alreadySent = new Set(
    (
      await prisma.messageLog.findMany({
        where: { kind, householdId: { in: households.map((h) => h.id) } },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  let sent = 0;
  let skipped = 0;
  const details: string[] = [];
  const targets = households.filter((h) => {
    if (h.members.length === 0) return false;
    if (audience === "unchecked") {
      const open = h.members.some((m) => m.goals.some((g) => g.week === week && !g.checkedInAt));
      if (!open) return false;
    }
    if (alreadySent.has(h.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  const outbox: OutboundItem[] = [];
  for (const h of targets) {
    const link = `${shulBaseUrl(shul)}/c/${h.token}`;
    const family = h.familyName ? `The ${h.familyName} Family` : "Your family";
    const body = text.replace(/\{link\}/g, link).replace(/\{family\}/g, family);
    const finalText = body.includes(link) ? body : `${body}\n\nYour family page: ${link}`;
    outbox.push({ household: h, message: { subject, text: finalText }, kind: kind, week });
  }
  for (const [id, channel] of await sendBatch(outbox)) {
    sent++;
    details.push(`household ${id} via ${channel}`);
  }
  return { week, sent, skipped, details };
}
