import { NextRequest, NextResponse } from "next/server";
import { runDailyReminders, type DailyJob } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  return header === `Bearer ${secret}` || key === secret;
}

/**
 * The one reminder cron. Vercel calls it every morning (see vercel.json);
 * it works out what today is and sends the Friday reminder, the Monday
 * check-in, and/or the every-two-days drip. `?job=friday|checkin|drip`
 * forces one job regardless of weekday for ops checks.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = req.nextUrl.searchParams.get("job");
  const only = job === "friday" || job === "checkin" || job === "drip" ? (job as DailyJob) : undefined;
  const result = await runDailyReminders(new Date(), only);
  return NextResponse.json(result);
}

export const POST = GET;
