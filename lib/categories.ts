export const CATEGORIES = ["man", "woman", "boy", "girl"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  man: "Man",
  woman: "Woman",
  boy: "Boy",
  girl: "Girl",
};

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

export function isChildCategory(c: Category): boolean {
  return c === "boy" || c === "girl";
}

/** Parse a Suggestion.categories CSV into a clean list. */
export function parseCategories(csv: string): Category[] {
  const parts = csv
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(isCategory);
  return parts.length ? parts : [...CATEGORIES];
}

export function categoriesInclude(csv: string, category: Category): boolean {
  return parseCategories(csv).includes(category);
}

/**
 * A member's category. New signups store it in Member.gender directly;
 * legacy rows (isChild + boy/girl or null) are mapped on read.
 */
export function memberCategory(m: { gender: string | null; isChild: boolean }): Category {
  if (isCategory(m.gender)) return m.gender;
  if (m.isChild) return m.gender === "girl" ? "girl" : "boy";
  return "man"; // legacy adults without a category — admin can correct
}
