import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findShulByHost } from "@/lib/tenant";
import { createSignup, type SignupBody } from "@/lib/signup";

export async function POST(req: NextRequest) {
  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // On a shul's own site the host picks the shul. On the national site the
  // form sends the shul the family chose (national shuls only).
  let shul = await findShulByHost(req.headers.get("host"));
  if (!shul && typeof body.shulId === "string") {
    shul = await prisma.shul.findFirst({ where: { id: body.shulId, hasSite: false, active: true } });
  }
  if (!shul) {
    return NextResponse.json({ error: "Pick your shul first." }, { status: 404 });
  }
  if (!shul.approved) {
    return NextResponse.json({ error: "This campaign isn't open yet — check back soon." }, { status: 403 });
  }
  const result = await createSignup(shul, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ token: result.token });
}
