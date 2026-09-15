/**
 * Participating shuls shown in the moving logo banner on the home page.
 * Drop a white-on-transparent PNG into public/shul-logos/ and add a row.
 * Order here is display order. `url` is optional (the logo links out).
 */
export type Participant = { name: string; logo: string; url?: string };

export const PARTICIPANTS: Participant[] = [
  // { name: "Adas Torah", logo: "/shul-logos/adas-torah.png", url: "https://shabboswithadas.com" },
];
