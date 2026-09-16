/**
 * Participating shuls: each gets a logo in the home-page banner and its own
 * page at kabalosshabbos.com/<slug>. On deploy, scripts/ensure-participants.ts
 * creates the shul row if it's missing and moves national signups whose
 * "your shul" note matches `noteMatch` onto it. Logos: white-on-transparent
 * PNG in public/shul-logos/ (plus an optional dark-on-transparent one).
 */
export type Participant = {
  slug: string;
  name: string;
  city: string;
  state?: string;
  logo: string;
  logoLight?: string;
  /** Lower-case fragments; a note containing any of them (ignoring spaces
   * and punctuation) belongs to this shul. */
  noteMatch: string[];
};

export const PARTICIPANTS: Participant[] = [
  {
    slug: "khh",
    name: "K'hal Hampshire Hills",
    city: "Jackson",
    state: "NJ",
    logo: "/shul-logos/khal-hampshire-hills-white.png",
    logoLight: "/shul-logos/khal-hampshire-hills.png",
    noteMatch: ["hampshirehills", "khalhh", "khh"],
  },
];

export function participantBySlug(slug: string): Participant | undefined {
  return PARTICIPANTS.find((p) => p.slug === slug);
}
