import { prisma } from "@/lib/db";
import { PLATFORM } from "@/lib/platform";

/**
 * The From header for every email. The display name is always the
 * platform name; EMAIL_FROM only supplies the address (either a bare
 * address or "Anything <address>"), so a stale name in the env var can't
 * leak into people's inboxes.
 */
export function emailFrom(): string {
  const raw = (process.env.EMAIL_FROM ?? "").trim();
  const address = (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim() || "onboarding@resend.dev";
  return `${PLATFORM.name} <${address}>`;
}

export type OutboundMessage = {
  subject: string; // email subject; ignored for SMS/WhatsApp
  text: string; // plain text body (works for all channels)
  sms?: string; // optional shorter version for texts; falls back to `text`
};

type Channel = "whatsapp" | "sms" | "email" | "console";

function twilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

async function sendTwilio(to: string, body: string, whatsapp: boolean): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = whatsapp
    ? process.env.TWILIO_WHATSAPP_FROM!
    : process.env.TWILIO_FROM_NUMBER!;
  const dest = whatsapp ? `whatsapp:${to}` : to;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: dest, From: from, Body: body }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio ${res.status}: ${detail.slice(0, 300)}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST to Resend with a few retries on 429 (Resend allows ~10 requests
 * a second; Retry-After is honoured) and on transient 5xx. */
async function resendPost(path: string, body: unknown): Promise<void> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://api.resend.com${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return;
    const detail = await res.text().catch(() => "");
    lastErr = new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
    if (res.status !== 429 && res.status < 500) throw lastErr;
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1200 * (attempt + 1));
  }
  throw lastErr ?? new Error("Resend: gave up");
}

export async function sendResend(to: string[], subject: string, text: string): Promise<void> {
  await resendPost("/emails", {
    from: emailFrom(),
    to,
    subject,
    text,
    ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
  });
}

/**
 * Send a message to a household. Email (Resend) is the primary channel;
 * when Twilio is configured and the family gave a phone, a text goes out
 * as well (WhatsApp if set up, else SMS). Each successful channel is
 * logged to MessageLog. Falls back to a console line in development.
 * Returns the first channel that worked, or null if every one failed.
 */
export async function sendToHousehold(
  household: {
    id: string;
    phone: string | null;
    email: string | null;
    email2?: string | null;
    email3?: string | null;
    smsOptIn: boolean;
    emailOptIn: boolean;
  },
  message: OutboundMessage,
  kind: string,
  week: number
): Promise<Channel | null> {
  const attempts: { channel: Channel; run: () => Promise<void> }[] = [];
  const emails = [household.email, household.email2, household.email3].filter((e): e is string => !!e);
  if (emails.length && household.emailOptIn && process.env.RESEND_API_KEY) {
    attempts.push({ channel: "email", run: () => sendResend(emails, message.subject, message.text) });
  }
  if (household.phone && household.smsOptIn && twilioConfigured()) {
    const viaWhatsApp = !!process.env.TWILIO_WHATSAPP_FROM;
    attempts.push({
      channel: viaWhatsApp ? "whatsapp" : "sms",
      run: () => sendTwilio(household.phone!, message.sms ?? message.text, viaWhatsApp),
    });
  }
  if (attempts.length === 0) {
    attempts.push({
      channel: "console",
      run: async () => {
        console.log(`[message:${kind}] household=${household.id} (no provider configured)\n${message.text}`);
      },
    });
  }

  let first: Channel | null = null;
  for (const attempt of attempts) {
    try {
      await attempt.run();
      await prisma.messageLog.create({ data: { householdId: household.id, kind, channel: attempt.channel, week } });
      first ??= attempt.channel;
    } catch (e) {
      console.error(`[message:${kind}] ${attempt.channel} failed for household ${household.id}:`, e);
    }
  }
  return first;
}

export async function sendPlatformEmail(to: string[], subject: string, text: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[platform-email] to=${to.join(",")} subject=${subject}\n${text}`);
    return false;
  }
  try {
    await sendResend(to, subject, text);
    return true;
  } catch (e) {
    console.error("[platform-email] failed:", e);
    return false;
  }
}

// ---------- batch delivery ----------

export type HouseholdContact = {
  id: string;
  phone: string | null;
  email: string | null;
  email2?: string | null;
  email3?: string | null;
  smsOptIn: boolean;
  emailOptIn: boolean;
};

export type OutboundItem = {
  household: HouseholdContact;
  message: OutboundMessage;
  kind: string;
  week: number;
};

const RESEND_BATCH = 100;

async function sendResendBatch(
  emails: { to: string[]; subject: string; text: string }[]
): Promise<void> {
  const from = emailFrom();
  await resendPost(
    "/emails/batch",
    emails.map((e) => ({
      from,
      to: e.to,
      subject: e.subject,
      text: e.text,
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
    }))
  );
}

/**
 * Deliver many messages efficiently. Households with a phone (when Twilio
 * is configured) go one by one through sendToHousehold; everyone else is
 * emailed through Resend's batch endpoint, 100 per call, so a shul of 500
 * families is five requests instead of five hundred. Returns the channel
 * used per household id; MessageLog rows are written for every success.
 */
export async function sendBatch(items: OutboundItem[]): Promise<Map<string, Channel>> {
  const delivered = new Map<string, Channel>();
  const emailQueue: (OutboundItem & { to: string[] })[] = [];
  const textQueue: OutboundItem[] = [];

  for (const item of items) {
    const h = item.household;
    const to = [h.email, h.email2, h.email3].filter((e): e is string => !!e);
    const viaEmail = to.length > 0 && h.emailOptIn && !!process.env.RESEND_API_KEY;
    const viaPhone = !!h.phone && h.smsOptIn && twilioConfigured();
    if (viaEmail) emailQueue.push({ ...item, to });
    if (viaPhone) textQueue.push(item);
    if (!viaEmail && !viaPhone) {
      const channel = await sendToHousehold(h, item.message, item.kind, item.week);
      if (channel) delivered.set(h.id, channel);
    }
  }

  for (let i = 0; i < emailQueue.length; i += RESEND_BATCH) {
    const chunk = emailQueue.slice(i, i + RESEND_BATCH);
    try {
      await sendResendBatch(chunk.map((c) => ({ to: c.to, subject: c.message.subject, text: c.message.text })));
      await prisma.messageLog.createMany({
        data: chunk.map((c) => ({ householdId: c.household.id, kind: c.kind, channel: "email", week: c.week })),
      });
      for (const c of chunk) delivered.set(c.household.id, "email");
    } catch (e) {
      console.error("[batch] Resend batch failed, falling back to single sends:", e);
      for (const c of chunk) {
        try {
          await sendResend(c.to, c.message.subject, c.message.text);
          await prisma.messageLog.create({ data: { householdId: c.household.id, kind: c.kind, channel: "email", week: c.week } });
          delivered.set(c.household.id, "email");
        } catch (err) {
          console.error(`[batch] email failed for household ${c.household.id}:`, err);
        }
        await sleep(150); // stay under Resend's ~10 requests/second
      }
    }
    // The batch endpoint allows ~2 requests/second.
    if (i + RESEND_BATCH < emailQueue.length) await sleep(550);
  }

  // Texts go one at a time (Twilio queues per number); email stays the record of delivery.
  const viaWhatsApp = !!process.env.TWILIO_WHATSAPP_FROM;
  for (const item of textQueue) {
    const h = item.household;
    try {
      await sendTwilio(h.phone!, item.message.sms ?? item.message.text, viaWhatsApp);
      await prisma.messageLog.create({ data: { householdId: h.id, kind: item.kind, channel: viaWhatsApp ? "whatsapp" : "sms", week: item.week } });
      if (!delivered.has(h.id)) delivered.set(h.id, viaWhatsApp ? "whatsapp" : "sms");
    } catch (e) {
      console.error(`[batch] text failed for household ${h.id}:`, e);
    }
  }
  return delivered;
}
