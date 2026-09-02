import type { Category } from "@/lib/categories";

/**
 * The avatar cast. Assigned at random when a family signs up (with a
 * shuffle button) — the shtick being that externals don't matter, what you
 * take on does. Every design is a face + headgear + a prop with a wink.
 * `group` keeps the legacy man/woman/boy/girl category for audiences.
 */
export type AvatarDef = {
  id: string;
  name: string; // the funny title shown on hover
  group: Category;
  head: Head;
  prop: Prop;
  skin: string;
  outfit: string;
};

export type Head =
  | "shtreimel" | "blackhat" | "srugi" | "nanach" | "velvet" | "fedora-beard" | "sunglasses-kippah"
  | "tichel" | "sheitel" | "beret" | "flowerhat" | "wrap"
  | "peyos-boy" | "cap-boy" | "pigtails" | "braids" | "toddler";
export type Prop =
  | "mic" | "kiddush" | "guitar" | "tambourine" | "coffee" | "sefer" | "challah" | "tea"
  | "cholent" | "lollipop" | "gragger" | "grapejuice" | "pacifier" | "headphones" | "none";

const S1 = "#f2dfc6", S2 = "#e2bf98", S3 = "#c48f62", S4 = "#8d5a3a";

export const AVATARS: AvatarDef[] = [
  // ---- men ----
  { id: "shtreimel-kiddush", name: "The Shtreimel", group: "man", head: "shtreimel", prop: "kiddush", skin: S1, outfit: "#22262c" },
  { id: "blackhat-mic", name: "The Baal Tefillah", group: "man", head: "blackhat", prop: "mic", skin: S2, outfit: "#22262c" },
  { id: "srugi-guitar", name: "The Kumzitz", group: "man", head: "srugi", prop: "guitar", skin: S3, outfit: "#2c4a6e" },
  { id: "nanach-tambourine", name: "The Na Nach", group: "man", head: "nanach", prop: "tambourine", skin: S1, outfit: "#f5f1e6" },
  { id: "velvet-coffee", name: "Coffee Before Shacharis", group: "man", head: "velvet", prop: "coffee", skin: S4, outfit: "#22262c" },
  { id: "fedora-sefer", name: "The Shiur Regular", group: "man", head: "fedora-beard", prop: "sefer", skin: S2, outfit: "#22262c" },
  { id: "kippah-sunglasses", name: "Motzei Shabbos Sunglasses", group: "man", head: "sunglasses-kippah", prop: "headphones", skin: S3, outfit: "#2c4a6e" },
  // ---- women ----
  { id: "tichel-mic", name: "The Zemiros Lead", group: "woman", head: "tichel", prop: "mic", skin: S2, outfit: "#2c4a6e" },
  { id: "sheitel-challah", name: "The Challah Queen", group: "woman", head: "sheitel", prop: "challah", skin: S1, outfit: "#7a3b4f" },
  { id: "beret-tea", name: "Tea and a Sefer", group: "woman", head: "beret", prop: "tea", skin: S3, outfit: "#2c4a6e" },
  { id: "flowerhat-tambourine", name: "Miriam's Tambourine", group: "woman", head: "flowerhat", prop: "tambourine", skin: S4, outfit: "#3e5a3c" },
  { id: "wrap-cholent", name: "The Cholent Boss", group: "woman", head: "wrap", prop: "cholent", skin: S2, outfit: "#22262c" },
  // ---- kids ----
  { id: "peyos-lollipop", name: "The Candy Man", group: "boy", head: "peyos-boy", prop: "lollipop", skin: S1, outfit: "#2c4a6e" },
  { id: "cap-gragger", name: "The Gragger", group: "boy", head: "cap-boy", prop: "gragger", skin: S3, outfit: "#3e5a3c" },
  { id: "pigtails-sefer", name: "The Parsha Question", group: "girl", head: "pigtails", prop: "sefer", skin: S2, outfit: "#c19a3d" },
  { id: "braids-grapejuice", name: "The Grape Juice", group: "girl", head: "braids", prop: "grapejuice", skin: S4, outfit: "#7a3b4f" },
  { id: "toddler-pacifier", name: "The Shabbos Nap", group: "boy", head: "toddler", prop: "pacifier", skin: S1, outfit: "#c19a3d" },
];

export const AVATAR_BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

export function avatarsFor(audience: "adult" | "child"): AvatarDef[] {
  return AVATARS.filter((a) => (audience === "child") === (a.group === "boy" || a.group === "girl"));
}

export function randomAvatar(audience: "adult" | "child", exclude?: string): AvatarDef {
  const pool = avatarsFor(audience).filter((a) => a.id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Legacy members (no stored avatar) get a stable pick from their category. */
export function fallbackAvatar(category: Category, seed = ""): AvatarDef {
  const pool = AVATARS.filter((a) => a.group === category);
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
