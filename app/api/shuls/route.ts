import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Shuls a family can pick from on the national signup. */
export async function GET() {
  const shuls = await prisma.shul.findMany({
    where: { active: true, approved: true, listed: true },
    orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, city: true, state: true, hasSite: true },
  });
  return NextResponse.json({ shuls });
}

