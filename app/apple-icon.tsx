import fs from "node:fs/promises";
import path from "node:path";
import { currentShul } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const shul = await currentShul();
  const file = shul?.slug === "adas" ? "apple-icon-adas.png" : "apple-icon-kabbalos.png";
  const buf = await fs.readFile(path.join(process.cwd(), "public", file));
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
