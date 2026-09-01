import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cleanSlug, slugProblem } from "@/lib/platform";
import { ROOT_DOMAIN } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** Live availability check for the onboarding form. */
export async function GET(req: NextRequest) {
  const slug = cleanSlug(req.nextUrl.searchParams.get("slug") ?? "");
  const problem = slugProblem(slug);
  if (problem) return NextResponse.json({ slug, ok: false, reason: problem });
  const taken = await prisma.shul.findUnique({ where: { slug }, select: { id: true } });
  return NextResponse.json({
    slug,
    ok: !taken,
    reason: taken ? "Already taken — try another." : null,
    host: `${slug}.${ROOT_DOMAIN}`,
  });
}
