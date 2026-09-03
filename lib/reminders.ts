import { prisma } from "@/lib/db";
import {
  campaignOf,
  shabbosOfWeek,
  formatShabbosDate,
} from "@/lib/campaign";
import { familyLink, type Shul } from "@/lib/tenant";
import { lastShabbosWeek, nextShabbosWeek, goalTitle } from "@/lib/household";
import { sendBatch, type OutboundItem } from "@/lib/messaging";

const DAY_MS = 24 * 60 * 60 * 1000;

/** MessageLog kinds for the weekly cadence. */
export const FRIDAY_KIND = "friday_reminder";
export const CHECKIN_KIND = "checkin_reminder";
export const DRIP_KIND = "checkin_drip";
/** A week's check-ins stay chased this many days after its Shabbos. */
const CHECKIN_WINDOW_DAYS = 8;
/** "Every two days": at least this long since the family's last reminder
 * (a little under 48h so a 9am cron two days later always qualifies). */
const DRIP_GAP_MS = 44 * 60 * 60 * 1000;

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
  const shuls = await prisma.shul.findMany({ where: { active: true, approved: true }, orderBy: { createdAt: "asc" } });
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
 * Friday (pre-Shabbos) reminder for one shul: what everyone committed to
 * for the coming Shabbos, plus a P.S. for still-open check-ins from last
 * week. Families who have already completed this week are left alone.
 */
export async function runFridayForShul(shul: Shul, now = new Date()): Promise<ReminderRunResult> {
  const campaign = campaignOf(shul);
  const week = nextShabbosWeek(campaign, now);
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
        where: { kind: FRIDAY_KIND, week, householdId: { in: households.map((h) => h.id) } },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  const targets = households.filter((h) => {
    if (h.members.length === 0) return false;
    if (weekCompleted(h.members, week)) return false;
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
      now.getTime() - shabbosOfWeek(campaign, prevWeek).getTime() <= CHECKIN_WINDOW_DAYS * DAY_MS &&
      h.members.some((m) => m.goals.some((g) => g.week === prevWeek && !g.checkedInAt));

    const link = familyLink(shul, h.token);
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

    outbox.push({ household: h, message: { subject: `${fam(h)}Shabbos is coming (week ${week} of ${campaign.weeks})`, text: lines.join("\n") }, kind: FRIDAY_KIND, week });
  }
  for (const [id, channel] of await sendBatch(outbox)) {
    sent++;
    details.push(`household ${id} via ${channel}`);
  }

  return { week, sent, skipped, details };
}

/** "Gofman family: " prefix so each subject reads as a personal note, not a blast. */
function fam(h: { familyName: string | null }): string {
  return h.familyName ? `${h.familyName} family: ` : "";
}

/** Families with a goal this week that isn't confirmed yet. */
function hasPending(members: { goals: { week: number; checkedInAt: Date | null }[] }[], week: number): boolean {
  return members.some((m) => m.goals.some((g) => g.week === week && !g.checkedInAt));
}

/** Every goal this week is confirmed (and there is at least one). */
function weekCompleted(members: { goals: { week: number; checkedInAt: Date | null }[] }[], week: number): boolean {
  const goals = members.flatMap((m) => m.goals.filter((g) => g.week === week));
  return goals.length > 0 && goals.every((g) => !!g.checkedInAt);
}

/**
 * Monday check-in reminder for one shul: the first "how did Shabbos go?"
 * to every family with an unconfirmed goal for the Shabbos just passed.
 * One per family per week (dedupes on its log kind).
 */
export async function runCheckinForShul(shul: Shul, now = new Date()): Promise<ReminderRunResult> {
  const campaign = campaignOf(shul);
  const week = lastShabbosWeek(campaign, now);
  if (week < 1) {
    return { week, sent: 0, skipped: 0, details: ["No Shabbos has passed yet."] };
  }
  const daysSince = Math.floor((now.getTime() - shabbosOfWeek(campaign, week).getTime()) / DAY_MS);
  if (daysSince > CHECKIN_WINDOW_DAYS) {
    return { week, sent: 0, skipped: 0, details: ["Check-in window has closed."] };
  }

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
        where: { kind: CHECKIN_KIND, week, householdId: { in: households.map((h) => h.id) } },
        select: { householdId: true },
      })
    ).map((r) => r.householdId)
  );
  const targets = households.filter((h) => {
    if (!hasPending(h.members, week)) return false;
    if (alreadySent.has(h.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  const outbox: OutboundItem[] = [];
  for (const h of targets) {
    const pending = h.members.filter((m) => m.goals.some((g) => g.week === week && !g.checkedInAt));
    const link = familyLink(shul, h.token);
    const names = pending.map((m) => m.name).join(" & ");
    const isLastWeek = week >= campaign.weeks;
    const text = [
      `✨ Gut voch! How did week ${week} go?`,
      `Check in for ${names} — every check-in grows your streak and the totals for your city.`,
      isLastWeek ? "" : `Your commitment carries into next Shabbos too — keep it going!`,
      ``,
      `Your family page: ${link}`,
    ]
      .filter((l, i, a) => l !== "" || a[i - 1] !== "")
      .join("\n");
    outbox.push({ household: h, message: { subject: `${fam(h)}how did Shabbos go? (week ${week})`, text }, kind: CHECKIN_KIND, week });
  }
  for (const [id, channel] of await sendBatch(outbox)) {
    sent++;
    details.push(`household ${id} via ${channel}`);
  }

  return { week, sent, skipped, details };
}

/**
 * Check-in drip for one shul: after the Monday reminder, a family that
 * still hasn't confirmed hears from us again every two days until they
 * check in or the week's window closes. "Every two days" is measured from
 * the last reminder we actually sent them (Monday reminder, an earlier
 * drip, or the Friday email's P.S.), so a nudge is never sent on top of
 * one from yesterday.
 */
export async function runCheckinDripForShul(shul: Shul, now = new Date()): Promise<ReminderRunResult> {
  const campaign = campaignOf(shul);
  const week = lastShabbosWeek(campaign, now);
  if (week < 1) {
    return { week, sent: 0, skipped: 0, details: ["No Shabbos has passed yet."] };
  }
  const daysSince = Math.floor((now.getTime() - shabbosOfWeek(campaign, week).getTime()) / DAY_MS);
  if (daysSince > CHECKIN_WINDOW_DAYS) {
    return { week, sent: 0, skipped: 0, details: ["Check-in window has closed."] };
  }

  const households = await prisma.household.findMany({
    where: { shulId: shul.id },
    include: { members: { include: { goals: true } } },
  });
  const pendingIds = households.filter((h) => hasPending(h.members, week)).map((h) => h.id);
  if (pendingIds.length === 0) {
    return { week, sent: 0, skipped: 0, details: ["Everyone has checked in."] };
  }

  // Latest reminder of any kind per family, and whether the Monday
  // reminder for this week has gone out (the drip only follows it).
  const logs = await prisma.messageLog.findMany({
    where: { householdId: { in: pendingIds }, kind: { in: [CHECKIN_KIND, DRIP_KIND, FRIDAY_KIND] } },
    select: { householdId: true, kind: true, week: true, sentAt: true },
  });
  const lastReminder = new Map<string, number>();
  const mondaySent = new Set<string>();
  for (const l of logs) {
    lastReminder.set(l.householdId, Math.max(lastReminder.get(l.householdId) ?? 0, l.sentAt.getTime()));
    if (l.kind === CHECKIN_KIND && l.week === week) mondaySent.add(l.householdId);
  }

  let sent = 0;
  let skipped = 0;
  const details: string[] = [`day ${daysSince} after Shabbos`];
  const targets = households.filter((h) => {
    if (!pendingIds.includes(h.id)) return false;
    if (!mondaySent.has(h.id)) return false; // the Monday reminder comes first
    const last = lastReminder.get(h.id) ?? 0;
    if (now.getTime() - last < DRIP_GAP_MS) {
      skipped++;
      return false;
    }
    return true;
  });

  const outbox: OutboundItem[] = [];
  for (const h of targets) {
    const pending = h.members.filter((m) => m.goals.some((g) => g.week === week && !g.checkedInAt));
    const link = familyLink(shul, h.token);
    const names = pending.map((m) => m.name).join(" & ");
    const text = [
      `👋 Quick nudge — ${names} ${pending.length === 1 ? "hasn't" : "haven't"} checked in yet for Shabbos week ${week}.`,
      `It takes 10 seconds, and late check-ins still count toward the totals:`,
      ``,
      `Your family page: ${link}`,
    ].join("\n");
    outbox.push({ household: h, message: { subject: `${fam(h)}still time to check in (week ${week})`, text }, kind: DRIP_KIND, week });
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
    const link = familyLink(shul, h.token);
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

    const link = familyLink(shul, h.token);
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

    outbox.push({ household: h, message: { subject: `${fam(h)}Good Erev Shabbos`, text: lines.join("\n") }, kind: kind, week });
  }
  for (const [id, channel] of await sendBatch(outbox)) {
    sent++;
    details.push(`household ${id} via ${channel}`);
  }

  return { week, sent, skipped, details };
}

// ---------- cron entrypoints: every active shul ----------
export async function runFridayReminders(now = new Date()): Promise<ReminderRunResult> {
  return forEachShul((shul) => runFridayForShul(shul, now));
}

export async function runCheckinReminders(now = new Date()): Promise<ReminderRunResult> {
  return forEachShul((shul) => runCheckinForShul(shul, now));
}

export async function runCheckinDrips(now = new Date()): Promise<ReminderRunResult> {
  return forEachShul((shul) => runCheckinDripForShul(shul, now));
}

export type DailyJob = "friday" | "checkin" | "drip";

/** Weekday name in the shul's timezone ("Mon", "Fri", ...). */
export function weekdayIn(timezone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(now);
  }
}

/**
 * The one daily cron. Runs every morning and decides per shul, by that
 * shul's local weekday and its families' check-in state:
 *   Friday      → pre-Shabbos reminder (skips families already done this week;
 *                 carries a P.S. for anyone still unconfirmed from last week)
 *   Saturday    → nothing
 *   Monday      → first check-in reminder for the Shabbos just passed
 *   Sun–Thu     → drip to families still unconfirmed, at most every 2 days
 *                 since their last reminder, only after the Monday reminder
 * `only` forces a single job regardless of weekday (ops / testing).
 */
export async function runDailyReminders(now = new Date(), only?: DailyJob): Promise<ReminderRunResult & { jobs: string[] }> {
  const jobs: string[] = [];
  const result = await forEachShul(async (shul) => {
    const day = weekdayIn(shul.timezone, now);
    const agg: ReminderRunResult = { week: 0, sent: 0, skipped: 0, details: [] };
    const run = async (name: DailyJob, job: () => Promise<ReminderRunResult>) => {
      const r = await job();
      if (!jobs.includes(name)) jobs.push(name);
      agg.week = r.week;
      agg.sent += r.sent;
      agg.skipped += r.skipped;
      agg.details.push(`${name}: sent ${r.sent}, skipped ${r.skipped}`, ...r.details.map((d) => `${name}: ${d}`));
    };
    if (only) {
      if (only === "friday") await run("friday", () => runFridayForShul(shul, now));
      if (only === "checkin") await run("checkin", () => runCheckinForShul(shul, now));
      if (only === "drip") await run("drip", () => runCheckinDripForShul(shul, now));
      return agg;
    }
    if (day === "Sat") {
      agg.details.push("Shabbos — nothing sent");
    } else if (day === "Fri") {
      await run("friday", () => runFridayForShul(shul, now));
    } else if (day === "Mon") {
      await run("checkin", () => runCheckinForShul(shul, now));
    } else {
      // Sun–Thu: the every-two-days drip (Wednesday, in practice, then the
      // Friday email's P.S. picks up anyone still open).
      await run("drip", () => runCheckinDripForShul(shul, now));
    }
    return agg;
  });
  return { ...result, jobs };
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
    const link = familyLink(shul, h.token);
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
