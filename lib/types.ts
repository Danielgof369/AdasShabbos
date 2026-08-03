export type SuggestionOption = {
  id: string;
  title: string;
  detail: string | null;
  audience: string; // "adult" | "kid" | "both"
};

export function audienceMatches(audience: string, isChild: boolean): boolean {
  if (audience === "both") return true;
  return isChild ? audience === "kid" : audience === "adult";
}

export type MemberGoalView = {
  memberId: string;
  name: string;
  isChild: boolean;
  /** Goal awaiting a check-in (its Shabbos has passed). */
  pending: {
    goalId: string;
    week: number;
    title: string;
    shabbosLabel: string;
  } | null;
  /** Goal set for the upcoming Shabbos, if any. */
  upcoming: {
    goalId: string;
    week: number;
    title: string;
    shabbosLabel: string;
    checkedIn: boolean;
  } | null;
  /** Week the member should set a goal for next (null if campaign over). */
  nextGoalWeek: number | null;
  /** Last commitment title, offered as the "same again" default. */
  lastTitle: string | null;
  /** Per-week history for the progress row: week -> "done" | "missed" | "set" | "none". */
  history: ("done" | "missed" | "set" | "none")[];
};
