import type { Category } from "@/lib/categories";

export type SuggestionOption = {
  id: string;
  title: string;
  detail: string | null;
  categories: string; // CSV of man/woman/boy/girl
};

export type MemberGoalView = {
  memberId: string;
  name: string;
  category: Category;
  isChild: boolean;
  /** Consecutive on-time weeks for this person. */
  streak: number;
  /** Goal awaiting a check-in (its Shabbos has passed). */
  pending: {
    goalId: string;
    week: number;
    title: string;
    shabbosLabel: string;
    /** true once the 48-hour streak window has closed */
    late: boolean;
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
  /** Per-week history: "done" | "late" | "missed" | "set" | "none". */
  history: ("done" | "late" | "missed" | "set" | "none")[];
};
