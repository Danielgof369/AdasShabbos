import { prisma } from "@/lib/db";
import {
  CampaignInfo,
  shabbosOfWeek,
  checkinDeadline,
  formatShabbosDate,
} from "@/lib/campaign";
import { memberCategory } from "@/lib/categories";
import type { MemberGoalView } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function goalTitle(goal: {
  customTitle: string | null;
  suggestion: { title: string } | null;
}): string {
  return goal.suggestion?.title ?? goal.customTitle ?? "your commitment";
}

/**
 * The latest campaign week whose Shabbos has already arrived (Saturday counts,
 * so Motzei Shabbos check-ins target the right week). 0 if none yet.
 */
export function lastShabbosWeek(campaign: CampaignInfo, now = new Date()): number {
  let last = 0;
  for (let w = 1; w <= campaign.weeks; w++) {
    if (shabbosOfWeek(campaign, w).getTime() <= now.getTime()) last = w;
  }
  return last;
}

/** The week whose Shabbos is next ahead of us (weeks + 1 if campaign is over). */
export function nextShabbosWeek(campaign: CampaignInfo, now = new Date()): number {
  for (let w = 1; w <= campaign.weeks; w++) {
    if (shabbosOfWeek(campaign, w).getTime() > now.getTime()) return w;
  }
  return campaign.weeks + 1;
}

/** Was this goal checked in within its 48-hour streak window? */
function onTime(
  campaign: CampaignInfo,
  week: number,
  checkedInAt: Date | null
): boolean {
  if (!checkedInAt) return false;
  return checkedInAt.getTime() <= checkinDeadline(campaign, week).getTime();
}

export async function getHouseholdView(token: string, campaign: CampaignInfo) {
  const household = await prisma.household.findUnique({
    where: { token },
    include: {
      members: {
        include: { goals: { include: { suggestion: true } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!household) return null;

  const now = new Date();
  const lastWeek = lastShabbosWeek(campaign, now);
  const nextWeek = nextShabbosWeek(campaign, now);

  const members: MemberGoalView[] = household.members.map((m) => {
    const byWeek = new Map(m.goals.map((g) => [g.week, g]));
    const category = memberCategory(m);

    // Pending check-in: most recent past-Shabbos goal not yet checked in,
    // within a ~8 day grace window. `late` = streak window already closed.
    let pending: MemberGoalView["pending"] = null;
    for (let w = lastWeek; w >= 1; w--) {
      const g = byWeek.get(w);
      if (!g) continue;
      const shabbos = shabbosOfWeek(campaign, w);
      const age = now.getTime() - shabbos.getTime();
      if (!g.checkedInAt && age <= 8 * DAY_MS) {
        pending = {
          goalId: g.id,
          week: w,
          title: goalTitle(g),
          shabbosLabel: formatShabbosDate(shabbos),
          late: now.getTime() > checkinDeadline(campaign, w).getTime(),
        };
      }
      break; // only the most recent past goal matters
    }

    const upcomingGoal = nextWeek <= campaign.weeks ? byWeek.get(nextWeek) : undefined;
    const upcoming = upcomingGoal
      ? {
          goalId: upcomingGoal.id,
          week: nextWeek,
          title: goalTitle(upcomingGoal),
          shabbosLabel: formatShabbosDate(shabbosOfWeek(campaign, nextWeek)),
          checkedIn: !!upcomingGoal.checkedInAt,
        }
      : null;

    const nextGoalWeek = nextWeek <= campaign.weeks ? nextWeek : null;

    const sorted = [...m.goals].sort((a, b) => b.week - a.week);
    const lastTitle = sorted.length ? goalTitle(sorted[0]) : null;

    const history: MemberGoalView["history"] = [];
    for (let w = 1; w <= campaign.weeks; w++) {
      const g = byWeek.get(w);
      if (g?.checkedInAt) history.push(onTime(campaign, w, g.checkedInAt) ? "done" : "late");
      else if (g && w <= lastWeek) history.push("missed");
      else if (g) history.push("set");
      else history.push("none");
    }

    // Personal streak: consecutive on-time weeks counting back from the most
    // recent closed week. A still-open pending week doesn't break the streak.
    let streak = 0;
    for (let w = lastWeek; w >= 1; w--) {
      const g = byWeek.get(w);
      if (g && onTime(campaign, w, g.checkedInAt)) {
        streak++;
      } else if (
        w === lastWeek &&
        now.getTime() <= checkinDeadline(campaign, w).getTime()
      ) {
        continue; // window still open — pending, not broken
      } else {
        break;
      }
    }

    return {
      memberId: m.id,
      name: m.name,
      category,
      isChild: category === "boy" || category === "girl",
      streak,
      pending,
      upcoming,
      nextGoalWeek,
      lastTitle,
      history,
    };
  });

  // Family streak: consecutive weeks (ending at the most recent closed week)
  // in which at least one family member checked in on time.
  let streak = 0;
  for (let w = lastWeek; w >= 1; w--) {
    const anyDone = household.members.some((m) =>
      m.goals.some((g) => g.week === w && onTime(campaign, w, g.checkedInAt))
    );
    if (anyDone) {
      streak++;
    } else if (w === lastWeek && now.getTime() <= checkinDeadline(campaign, w).getTime()) {
      continue;
    } else {
      break;
    }
  }

  return {
    id: household.id,
    token: household.token,
    familyName: household.familyName,
    phone: household.phone,
    email: household.email,
    streak,
    members,
  };
}
