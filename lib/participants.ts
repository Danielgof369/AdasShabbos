/**
 * Participating shuls shown in the moving logo banner on the home page.
 * Drop a white-on-transparent PNG into public/shul-logos/ and add a row.
 * Order here is display order. `url` is optional (the logo links out).
 */
export type Participant = { name: string; logo: string; url?: string };

export const PARTICIPANTS: Participant[] = [
  { name: "K'hal Hampshire Hills, Jackson NJ", logo: "/shul-logos/khal-hampshire-hills-white.png" },
];
