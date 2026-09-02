import type { Category } from "@/lib/categories";
import { AVATAR_BY_ID, fallbackAvatar, type AvatarDef, type Head, type Prop } from "@/lib/avatars";

/**
 * The avatar cast, drawn inline. Flat shapes, closed-eyes smiles, tznius,
 * each with a headgear and a prop that gives it a wink. Pass `avatar` (an
 * id from lib/avatars) or fall back to a stable pick for the category.
 */
const NAVY = "#1c3350", GOLD = "#c19a3d", DARK = "#22262c", CREAM = "#faf6ee", HAIR = "#4a2f1a", RED = "#b3402f";

function Headgear({ head }: { head: Head }) {
  switch (head) {
    case "shtreimel":
      return (
        <>
          <ellipse cx="50" cy="20" rx="21" ry="7" fill="#3a2a1c" />
          <ellipse cx="50" cy="16" rx="21" ry="8" fill="#5a4130" />
          <ellipse cx="50" cy="14" rx="14" ry="4" fill="#3a2a1c" />
          <path d="M40 36 q-4 6 -3 14" stroke={HAIR} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M60 36 q4 6 3 14" stroke={HAIR} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      );
    case "blackhat":
      return (
        <>
          <ellipse cx="50" cy="20" rx="19" ry="4" fill={DARK} />
          <path d="M38 20 Q38 7 50 7 Q62 7 62 20 Z" fill={DARK} />
          <rect x="38" y="15" width="24" height="3" fill="#3a3f47" />
        </>
      );
    case "srugi":
      return (
        <>
          <path d="M40 22 Q50 14 60 22 Q50 19 40 22 Z" fill={NAVY} />
          <path d="M42 21.5 Q50 16.5 58 21.5" stroke={GOLD} strokeWidth="1.2" fill="none" />
          <path d="M36 30 Q36 18 50 18 Q64 18 64 30 Q60 24 50 24 Q40 24 36 30 Z" fill={HAIR} />
        </>
      );
    case "nanach":
      return (
        <>
          <path d="M37 24 Q50 8 63 24 Q50 18 37 24 Z" fill={CREAM} stroke={DARK} strokeWidth="1" />
          <path d="M40 34 q-6 8 -4 22" stroke={HAIR} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M60 34 q6 8 4 22" stroke={HAIR} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "velvet":
      return (
        <>
          <path d="M40 21 Q50 14 60 21 Q50 18 40 21 Z" fill={DARK} />
          <path d="M37 30 Q37 18 50 18 Q63 18 63 30 Q59 24 50 24 Q41 24 37 30 Z" fill={HAIR} />
        </>
      );
    case "fedora-beard":
      return (
        <>
          <ellipse cx="50" cy="20" rx="20" ry="4" fill="#3a3f47" />
          <path d="M38 20 Q38 8 50 8 Q62 8 62 20 Z" fill="#3a3f47" />
          <path d="M39 33 Q40 48 50 48 Q60 48 61 33 Q55 40 50 41 Q45 40 39 33 Z" fill={HAIR} />
        </>
      );
    case "sunglasses-kippah":
      return (
        <>
          <path d="M40 21 Q50 14 60 21 Q50 18 40 21 Z" fill={GOLD} />
          <rect x="38" y="27" width="10" height="6" rx="2" fill={DARK} />
          <rect x="52" y="27" width="10" height="6" rx="2" fill={DARK} />
          <path d="M48 30 L52 30" stroke={DARK} strokeWidth="1.5" />
        </>
      );
    case "tichel":
      return (
        <>
          <path d="M36 30 Q36 14 50 14 Q64 14 64 30 Q62 22 50 21 Q38 22 36 30 Z" fill={GOLD} />
          <path d="M60 18 q10 -2 8 8" stroke={GOLD} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M40 19 Q50 23 60 19" stroke={CREAM} strokeWidth="1.5" fill="none" />
        </>
      );
    case "sheitel":
      return (
        <>
          <path d="M35 32 Q35 14 50 14 Q65 14 65 32 L65 44 Q62 40 60 34 Q50 26 40 34 Q38 40 35 44 Z" fill={HAIR} />
        </>
      );
    case "beret":
      return (
        <>
          <path d="M34 30 Q34 16 50 16 Q66 16 66 30 Q60 26 50 26 Q40 26 34 30 Z" fill={HAIR} />
          <ellipse cx="46" cy="16" rx="16" ry="6" fill="#7a3b4f" />
          <circle cx="46" cy="10" r="2" fill="#7a3b4f" />
        </>
      );
    case "flowerhat":
      return (
        <>
          <ellipse cx="50" cy="21" rx="21" ry="4.5" fill="#3e5a3c" />
          <path d="M38 21 Q38 9 50 9 Q62 9 62 21 Z" fill="#3e5a3c" />
          <circle cx="60" cy="13" r="3.5" fill={GOLD} />
          <circle cx="60" cy="13" r="1.5" fill={RED} />
          <path d="M36 30 Q40 25 50 25 Q60 25 64 30" stroke={HAIR} strokeWidth="4" fill="none" />
        </>
      );
    case "wrap":
      return (
        <>
          <path d="M36 30 Q36 12 50 10 Q64 12 64 30 Q62 22 50 21 Q38 22 36 30 Z" fill={NAVY} />
          <path d="M44 12 Q50 6 56 12" stroke={GOLD} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M40 19 Q50 15 60 19" stroke={GOLD} strokeWidth="1.5" fill="none" />
        </>
      );
    case "peyos-boy":
      return (
        <>
          <path d="M41 33 Q50 27 59 33 Q50 31 41 33 Z" fill={DARK} />
          <path d="M39 44 q-3 5 -1 12" stroke={HAIR} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M61 44 q3 5 1 12" stroke={HAIR} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M39 42 Q39 30 50 30 Q61 30 61 42 Q57 36 50 36 Q43 36 39 42 Z" fill={HAIR} />
        </>
      );
    case "cap-boy":
      return (
        <>
          <path d="M38 40 Q38 28 50 28 Q62 28 62 40 Z" fill={NAVY} />
          <path d="M36 40 L64 40 L66 44 L34 44 Z" fill={NAVY} />
          <circle cx="50" cy="28" r="1.8" fill={GOLD} />
        </>
      );
    case "pigtails":
      return (
        <>
          <path d="M38 42 Q38 28 50 28 Q62 28 62 42 Q62 34 50 34 Q38 34 38 42 Z" fill={HAIR} />
          <circle cx="35.5" cy="44" r="4.5" fill={HAIR} />
          <circle cx="64.5" cy="44" r="4.5" fill={HAIR} />
          <circle cx="36" cy="39" r="2.2" fill={RED} />
          <circle cx="64" cy="39" r="2.2" fill={RED} />
        </>
      );
    case "braids":
      return (
        <>
          <path d="M38 42 Q38 28 50 28 Q62 28 62 42 Q62 34 50 34 Q38 34 38 42 Z" fill="#2a1a10" />
          <path d="M37 42 q-2 8 0 16" stroke="#2a1a10" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M63 42 q2 8 0 16" stroke="#2a1a10" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="37" cy="58" r="2" fill={GOLD} />
          <circle cx="63" cy="58" r="2" fill={GOLD} />
        </>
      );
    case "toddler":
      return (
        <>
          <path d="M44 33 q6 -6 12 0" stroke={HAIR} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M50 29 q2 -5 5 -3" stroke={HAIR} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      );
  }
}

function PropArt({ prop, y }: { prop: Prop; y: number }) {
  // Props sit at the right hand; `y` shifts for shorter kid bodies.
  const g = `translate(0 ${y})`;
  switch (prop) {
    case "mic":
      return (
        <g transform={g}>
          <rect x="70" y="60" width="5" height="22" rx="2.5" fill="#3a3f47" transform="rotate(-20 72 70)" />
          <circle cx="76" cy="56" r="6" fill={DARK} />
          <path d="M72 53 h8 M71 56 h10 M72 59 h8" stroke="#8a8f99" strokeWidth="0.8" />
        </g>
      );
    case "kiddush":
      return (
        <g transform={g}>
          <path d="M70 62 h10 l-1.5 10 q-3.5 3 -7 0 Z" fill={GOLD} />
          <rect x="74" y="72" width="2" height="8" fill={GOLD} />
          <rect x="70" y="80" width="10" height="2.5" rx="1" fill={GOLD} />
          <path d="M71 63 h8 l-1 7 h-6 Z" fill="#6b2a3a" />
        </g>
      );
    case "guitar":
      return (
        <g transform={`${g} rotate(25 70 78)`}>
          <ellipse cx="72" cy="82" rx="9" ry="7" fill="#8b5a2b" />
          <ellipse cx="72" cy="72" rx="7" ry="6" fill="#8b5a2b" />
          <circle cx="72" cy="79" r="2.5" fill={DARK} />
          <rect x="71" y="48" width="2.5" height="24" fill="#4a2f1a" />
          <path d="M72 50 v30" stroke={CREAM} strokeWidth="0.6" />
        </g>
      );
    case "tambourine":
      return (
        <g transform={g}>
          <circle cx="76" cy="66" r="10" fill="none" stroke="#8b5a2b" strokeWidth="3" />
          <circle cx="76" cy="66" r="7" fill="#f3e6c8" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle key={a} cx={76 + 10 * Math.cos((a * Math.PI) / 180)} cy={66 + 10 * Math.sin((a * Math.PI) / 180)} r="1.6" fill={GOLD} />
          ))}
        </g>
      );
    case "coffee":
      return (
        <g transform={g}>
          <path d="M68 66 h12 v10 q0 4 -4 4 h-4 q-4 0 -4 -4 Z" fill={CREAM} stroke={DARK} strokeWidth="1" />
          <path d="M80 69 q5 0 5 4 q0 4 -5 4" fill="none" stroke={DARK} strokeWidth="1.2" />
          <path d="M71 62 q1 -3 0 -5 M75 62 q1 -3 0 -5" stroke="#8a8f99" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      );
    case "sefer":
      return (
        <g transform={g}>
          <rect x="67" y="62" width="14" height="18" rx="1.5" fill="#6b2a3a" />
          <rect x="69" y="62" width="10" height="18" fill="#7f3346" />
          <path d="M70 68 h8 M70 71 h8 M70 74 h6" stroke={GOLD} strokeWidth="1" />
        </g>
      );
    case "challah":
      return (
        <g transform={g}>
          <path d="M64 70 q6 -8 12 0 q6 -8 12 0 q-6 8 -12 0 q-6 8 -12 0 Z" fill="#c8862e" />
          <path d="M66 70 q5 -5 10 0 q5 -5 10 0" stroke="#e9b25a" strokeWidth="1.5" fill="none" />
          <circle cx="70" cy="67" r="0.8" fill={CREAM} /><circle cx="80" cy="66" r="0.8" fill={CREAM} /><circle cx="85" cy="70" r="0.8" fill={CREAM} />
        </g>
      );
    case "tea":
      return (
        <g transform={g}>
          <path d="M67 68 h14 v6 q0 5 -7 5 q-7 0 -7 -5 Z" fill={CREAM} stroke={DARK} strokeWidth="1" />
          <path d="M81 70 q4 0 4 3 q0 3 -4 3" fill="none" stroke={DARK} strokeWidth="1.2" />
          <ellipse cx="74" cy="80" rx="9" ry="1.8" fill="none" stroke={DARK} strokeWidth="1" />
          <path d="M72 64 q1 -3 0 -5 M76 64 q1 -3 0 -5" stroke="#8a8f99" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      );
    case "cholent":
      return (
        <g transform={g}>
          <path d="M64 66 h20 v10 q0 5 -10 5 q-10 0 -10 -5 Z" fill="#3a3f47" />
          <rect x="62" y="64" width="24" height="3" rx="1.5" fill="#3a3f47" />
          <circle cx="74" cy="62" r="2" fill="#3a3f47" />
          <path d="M70 60 q1 -4 0 -7 M78 60 q1 -4 0 -7" stroke="#8a8f99" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      );
    case "lollipop":
      return (
        <g transform={g}>
          <rect x="74" y="66" width="2" height="14" fill={CREAM} />
          <circle cx="75" cy="63" r="6" fill={RED} />
          <path d="M75 63 m-4 0 a4 4 0 0 1 8 0 a2 2 0 0 1 -4 0" fill="none" stroke={CREAM} strokeWidth="1.2" />
        </g>
      );
    case "gragger":
      return (
        <g transform={g}>
          <rect x="74" y="70" width="2.5" height="12" fill="#8b5a2b" />
          <rect x="68" y="60" width="14" height="10" rx="2" fill={NAVY} />
          <rect x="70" y="62" width="10" height="6" fill={GOLD} />
        </g>
      );
    case "grapejuice":
      return (
        <g transform={g}>
          <path d="M70 64 h9 l-1 9 q-3.5 2.5 -7 0 Z" fill="#cfd6e0" opacity="0.7" />
          <path d="M71 66 h7 l-0.8 6.5 h-5.4 Z" fill="#5b2a6e" />
          <rect x="73.5" y="73" width="2" height="6" fill="#cfd6e0" />
          <rect x="70" y="79" width="9" height="2" rx="1" fill="#cfd6e0" />
        </g>
      );
    case "pacifier":
      return (
        <g transform={g}>
          <circle cx="50" cy="39.5" r="3.5" fill={RED} />
          <circle cx="50" cy="39.5" r="1.5" fill={CREAM} />
        </g>
      );
    case "headphones":
      return (
        <g transform={g}>
          <path d="M37 32 Q37 14 50 14 Q63 14 63 32" fill="none" stroke={DARK} strokeWidth="2.5" />
          <rect x="34" y="28" width="6" height="9" rx="2" fill={DARK} />
          <rect x="60" y="28" width="6" height="9" rx="2" fill={DARK} />
        </g>
      );
    case "none":
      return null;
  }
}

function Figure({ a }: { a: AvatarDef }) {
  const kid = a.group === "boy" || a.group === "girl";
  const dress = a.group === "woman" || a.group === "girl";
  const headY = kid ? 41 : 30;
  const r = kid ? 12 : 13;
  const shift = kid ? 10 : 0;
  return (
    <>
      {/* body */}
      {dress ? (
        <path d={kid
          ? "M37 66 Q39 55 50 55 Q61 55 63 66 L66 97 Q66 100 63 100 L37 100 Q34 100 34 97 Z"
          : "M36 58 Q38 46 50 46 Q62 46 64 58 L69 96 Q69 100 65 100 L35 100 Q31 100 31 96 Z"} fill={a.outfit} />
      ) : (
        <path d={kid
          ? "M33 68 Q33 55 50 55 Q67 55 67 68 L67 97 Q67 100 64 100 L36 100 Q33 100 33 97 Z"
          : "M30 62 Q30 46 50 46 Q70 46 70 62 L70 96 Q70 100 66 100 L34 100 Q30 100 30 96 Z"} fill={a.outfit} />
      )}
      {!dress && <path d={kid ? "M44 56 L50 66 L56 56 Q50 53 44 56 Z" : "M43 47 L50 60 L57 47 Q50 44 43 47 Z"} fill={a.outfit === "#f5f1e6" ? "#e2ded2" : "#ffffff"} />}
      {dress && <circle cx="50" cy={kid ? 58 : 48} r="3" fill={GOLD} />}
      {/* head */}
      <circle cx="50" cy={headY} r={r} fill={a.skin} />
      {/* smile + closed eyes */}
      <path d={`M44 ${headY + 4} q6 5 12 0`} stroke={DARK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d={`M44 ${headY - 2} q2 -2 4 0 M52 ${headY - 2} q2 -2 4 0`} stroke={DARK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* headgear is drawn in adult coordinates; kids are shifted down */}
      <g transform={kid && !["peyos-boy", "cap-boy", "pigtails", "braids", "toddler"].includes(a.head) ? `translate(0 ${shift})` : undefined}>
        <Headgear head={a.head} />
      </g>
      <PropArt prop={a.prop} y={kid ? 6 : 0} />
    </>
  );
}

export default function Avatar({
  category,
  avatar,
  celebrating = false,
  className = "h-20 w-auto",
  seed = "",
  title,
}: {
  category: Category;
  avatar?: string | null;
  celebrating?: boolean;
  className?: string;
  /** Stable fallback pick for legacy members without a stored avatar. */
  seed?: string;
  title?: boolean;
}) {
  const def = (avatar && AVATAR_BY_ID.get(avatar)) || fallbackAvatar(category, seed);
  return (
    <span className={`avatar-wrap inline-block ${celebrating ? "avatar-pop" : ""}`} title={title ? def.name : undefined}>
      <svg viewBox="0 0 100 104" className={className} role="img" aria-label={def.name}>
        <Figure a={def} />
      </svg>
    </span>
  );
}
