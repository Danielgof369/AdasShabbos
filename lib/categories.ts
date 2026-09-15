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

/** Suggestion audiences (per the Rav: just adult / child / both). */
export type Audience = "adult" | "child" | "both";

/**
 * Parse a Suggestion.categories value into an audience.
 * Backward-compatible with older values ("man,woman", "boy,girl", 4-way CSVs).
 */
export function parseAudience(csv: string): Audience {
  const parts = new Set(
    csv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  if (parts.has("both") || parts.has("all")) return "both";
  const adult = parts.has("adult") || parts.has("man") || parts.has("woman");
  const child = parts.has("child") || parts.has("kid") || parts.has("boy") || parts.has("girl");
  if (adult && child) return "both";
  if (child) return "child";
  return "adult";
}

/**
 * Does a suggestion apply to one specific category? Understands the
 * gendered lists ("man", "woman", "boy", "girl") as well as the broad
 * words ("adult", "child", "both").
 */
export function appliesTo(csv: string, category: Category): boolean {
  const parts = new Set(csv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (parts.has("both") || parts.has("all")) return true;
  if (parts.has(category)) return true;
  if (isChildCategory(category)) return parts.has("child") || parts.has("kid");
  if (parts.has("adult")) return true;
  if (parts.has("man") || parts.has("woman")) return false; // the other gender's list
  // Nothing adult-specific named: it's an adult item unless it's child-only.
  return !(parts.has("child") || parts.has("kid") || parts.has("boy") || parts.has("girl"));
}

/** Does a suggestion apply to a member? Pass the category when known;
 * a boolean (isChild) is the older, coarser call. */
export function audienceMatches(csv: string, memberCategory: Category | boolean): boolean {
  if (typeof memberCategory !== "boolean") return appliesTo(csv, memberCategory);
  const audience = parseAudience(csv);
  if (audience === "both") return true;
  return audience === (memberCategory ? "child" : "adult");
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
