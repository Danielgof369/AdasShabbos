import fs from "node:fs/promises";
import path from "node:path";
import { currentShul } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Favicon per host: the Kabbalos Shabbos mark, or Adas's own on its site. */
export default async function Icon() {
  const shul = await currentShul();
  const file = shul?.slug === "adas" ? "favicon-adas.png" : "favicon-kabbalos.png";
  const buf = await fs.readFile(path.join(process.cwd(), "public", file));
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
