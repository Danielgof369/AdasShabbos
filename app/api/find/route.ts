import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findShulByHost } from "@/lib/tenant";
import { normalizePhone, normalizeEmail } from "@/lib/contact";

export async function POST(req: NextRequest) {
  let body: { contact?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const raw = typeof body.contact === "string" ? body.contact.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "Enter a phone number or email." }, { status: 400 });
  }

  const phone = normalizePhone(raw);
  const email = normalizeEmail(raw);
  const shul = await findShulByHost(req.headers.get("host"));
  if (shul && !shul.approved) {
    return NextResponse.json({ error: "This campaign isn't open yet — check back soon." }, { status: 403 });
  }

  const household = await prisma.household.findFirst({
    where: {
      shulId: shul?.id ?? "none",
      OR: [
        ...(phone ? [{ phone }] : []),
        ...(email ? [{ email }, { email2: email }, { email3: email }] : []),
      ],
    },
  });

  if (!household) {
    return NextResponse.json(
      { error: "We couldn't find a signup with that contact info. Try the other one, or sign up fresh!" },
      { status: 404 }
    );
  }

  return NextResponse.json({ token: household.token });
}
