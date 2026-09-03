"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getShul } from "@/lib/tenant";
import { isAdmin, grantAdmin, revokeAdmin } from "@/lib/adminAuth";
import {
  runFridayForShul,
  runCheckinForShul,
  runRaffleDeadlineForShul,
  runErevShabbosForShul,
} from "@/lib/reminders";
import { raffleEligible } from "@/lib/raffle";
import type { Shul } from "@prisma/client";

export async function loginAction(formData: FormData) {
  const shul = await getShul();
  const password = String(formData.get("password") ?? "");
  await grantAdmin(shul, password);
  revalidatePath("/admin");
}

export async function logoutAction() {
  await revokeAdmin();
  revalidatePath("/admin");
}

async function requireAdmin(): Promise<Shul> {
  const shul = await getShul();
  if (!(await isAdmin(shul))) throw new Error("Not authorized");
  return shul;
}

const text = (formData: FormData, key: string, max: number) =>
  String(formData.get(key) ?? "").trim().slice(0, max);

export async function saveCampaignAction(formData: FormData) {
  const shul = await requireAdmin();
  await prisma.shul.update({
    where: { id: shul.id },
    data: {
      campaignName: text(formData, "name", 100) || shul.campaignName,
      seasonLabel: text(formData, "seasonLabel", 40) || shul.seasonLabel,
      partnerName: text(formData, "partnerName", 100) || null,
      contactEmail: text(formData, "contactEmail", 120) || null,
      pledgeEnabled: formData.get("pledgeEnabled") === "on",
      charityName: text(formData, "charityName", 100) || shul.charityName,
      pledgePerSignup: Math.max(0, Math.min(1000, Number(formData.get("pledgePerSignup")) || 0)),
      raffleEnabled: formData.get("raffleEnabled") === "on",
      rafflePrize: text(formData, "rafflePrize", 80) || shul.rafflePrize,
      listed: formData.get("listed") === "on",
      whyText: text(formData, "whyText", 4000) || null,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveAnnouncementAction(formData: FormData) {
  const shul = await requireAdmin();
  const title = text(formData, "announcementTitle", 120);
  await prisma.shul.update({
    where: { id: shul.id },
    data: {
      announcementTitle: title || null,
      announcementBody: text(formData, "announcementBody", 600) || null,
      announcementUrl: text(formData, "announcementUrl", 300) || null,
      announcementUpdatedAt: title ? new Date() : null,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveResourceAction(formData: FormData) {
  const shul = await requireAdmin();
  const id = text(formData, "id", 40);
  const data = {
    kicker: text(formData, "kicker", 60) || null,
    title: text(formData, "title", 120),
    byline: text(formData, "byline", 120) || null,
    description: text(formData, "description", 400) || null,
    url: text(formData, "url", 300),
    emoji: text(formData, "emoji", 8) || "📄",
    sortOrder: Number(formData.get("sortOrder")) || 0,
  };
  if (!data.title || !data.url) throw new Error("Title and link are required");
  if (!/^(\/|https?:\/\/)/.test(data.url)) throw new Error("Link must start with / or https://");
  if (id) {
    await prisma.resource.updateMany({ where: { id, shulId: shul.id }, data });
  } else {
    await prisma.resource.create({ data: { ...data, shulId: shul.id } });
  }
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/resources");
}

export async function deleteResourceAction(formData: FormData) {
  const shul = await requireAdmin();
  const id = text(formData, "id", 40);
  if (!id) return;
  await prisma.resource.deleteMany({ where: { id, shulId: shul.id } });
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/resources");
}

export async function saveSuggestionAction(formData: FormData) {
  const shul = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const pickedCategories = ["adult", "child"].filter(
    (c) => formData.get(`cat_${c}`) === "on"
  );
  const data = {
    title: String(formData.get("title") ?? "").trim().slice(0, 120),
    detail: String(formData.get("detail") ?? "").trim().slice(0, 300) || null,
    unitLabel: String(formData.get("unitLabel") ?? "").trim().slice(0, 80),
    unitValue: Math.max(1, Number(formData.get("unitValue")) || 1),
    categories: pickedCategories.length === 1 ? pickedCategories[0] : "both",
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder")) || 0,
  };
  if (!data.title || !data.unitLabel) throw new Error("Title and unit label are required");
  if (id) {
    // updateMany so the shulId filter guarantees tenant isolation
    await prisma.suggestion.updateMany({ where: { id, shulId: shul.id }, data });
  } else {
    await prisma.suggestion.create({ data: { ...data, shulId: shul.id } });
  }
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/signup");
}

export async function deleteSuggestionAction(formData: FormData) {
  const shul = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const suggestion = await prisma.suggestion.findFirst({
    where: { id, shulId: shul.id },
  });
  if (!suggestion) return;
  const used = await prisma.goal.count({ where: { suggestionId: id } });
  if (used > 0) {
    // Keep history intact — just hide it from pickers.
    await prisma.suggestion.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.suggestion.delete({ where: { id } });
  }
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function sendFridayAction() {
  const shul = await requireAdmin();
  await runFridayForShul(shul);
  revalidatePath("/admin");
}

export async function sendCheckinAction() {
  const shul = await requireAdmin();
  await runCheckinForShul(shul);
  revalidatePath("/admin");
}

export async function sendErevShabbosAction() {
  const shul = await requireAdmin();
  await runErevShabbosForShul(shul);
  revalidatePath("/admin");
}

export async function sendRaffleDeadlineAction(formData: FormData) {
  const shul = await requireAdmin();
  const deadlineText = String(formData.get("deadlineText") ?? "").trim().slice(0, 300);
  if (!deadlineText) return;
  await runRaffleDeadlineForShul(shul, deadlineText);
  revalidatePath("/admin");
}

export async function deleteHouseholdAction(formData: FormData) {
  const shul = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const household = await prisma.household.findFirst({ where: { id, shulId: shul.id } });
  if (!household) return;
  await prisma.messageLog.deleteMany({ where: { householdId: id } });
  await prisma.household.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/families");
}

export async function deleteMemberAction(formData: FormData) {
  const shul = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const member = await prisma.member.findUnique({
    where: { id },
    include: { household: { include: { members: true } } },
  });
  if (!member || member.household.shulId !== shul.id) return;
  await prisma.member.delete({ where: { id } });
  // If that was the household's last member, remove the empty household too.
  if (member.household.members.length <= 1) {
    await prisma.messageLog.deleteMany({ where: { householdId: member.householdId } });
    await prisma.household.delete({ where: { id: member.householdId } }).catch(() => {});
  }
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/families");
}

export async function drawRaffleAction(formData: FormData) {
  const shul = await requireAdmin();
  const week = Number(formData.get("week"));
  if (!Number.isInteger(week) || week < 1 || week > 12) return;
  const eligible = await raffleEligible(shul.id, week);
  if (eligible.length === 0) return;
  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  await prisma.raffleDraw.upsert({
    where: { shulId_week: { shulId: shul.id, week } },
    update: {
      householdId: winner.id,
      familyName: winner.familyName ?? winner.token,
      drawnAt: new Date(),
    },
    create: {
      shulId: shul.id,
      week,
      householdId: winner.id,
      familyName: winner.familyName ?? winner.token,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function mergeHouseholdsAction(formData: FormData) {
  const shul = await requireAdmin();
  const keepId = String(formData.get("keepId") ?? "");
  const absorbId = String(formData.get("absorbId") ?? "");
  if (!keepId || !absorbId || keepId === absorbId) return;

  const [keep, absorb] = await Promise.all([
    prisma.household.findFirst({ where: { id: keepId, shulId: shul.id } }),
    prisma.household.findFirst({ where: { id: absorbId, shulId: shul.id } }),
  ]);
  if (!keep || !absorb) return;

  // Move people (and with them, all goals/check-ins) to the kept family.
  await prisma.member.updateMany({
    where: { householdId: absorbId },
    data: { householdId: keepId },
  });
  await prisma.messageLog.updateMany({
    where: { householdId: absorbId },
    data: { householdId: keepId },
  });

  // Combine contact details: fill the kept family's empty slots.
  const knownEmails = new Set(
    [keep.email, keep.email2, keep.email3].filter(Boolean) as string[]
  );
  const incoming = [absorb.email, absorb.email2, absorb.email3].filter(
    (e): e is string => !!e && !knownEmails.has(e)
  );
  await prisma.household.update({
    where: { id: keepId },
    data: {
      phone: keep.phone ?? absorb.phone,
      email: keep.email ?? incoming.shift() ?? null,
      email2: keep.email2 ?? incoming.shift() ?? null,
      email3: keep.email3 ?? incoming.shift() ?? null,
      familyName: keep.familyName ?? absorb.familyName,
    },
  });

  await prisma.household.delete({ where: { id: absorbId } });
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/families");
}

// ---------- self-service: schedule, logos, password, custom blasts, support ----------

import { runCustomBlastForShul } from "@/lib/reminders";
import { shulAdminHash } from "@/lib/adminAuth";
import { sendPlatformEmail } from "@/lib/messaging";
import { shulBaseUrl } from "@/lib/tenant";
import { PLATFORM, TIMEZONES, isIsoDate, utcOffsetOn } from "@/lib/platform";

export async function saveScheduleAction(formData: FormData) {
  const shul = await requireAdmin();
  const dates = [
    ...new Set(
      String(formData.get("shabbosDates") ?? "")
        .split(/[,\s]+/)
        .map((d) => d.trim())
        .filter(Boolean)
    ),
  ].sort();
  if (dates.length < 1 || dates.length > 12) throw new Error("Between 1 and 12 Shabbos dates");
  for (const d of dates) {
    if (!isIsoDate(d)) throw new Error(`${d} is not a date (use YYYY-MM-DD)`);
    if (new Date(`${d}T12:00:00Z`).getUTCDay() !== 6) throw new Error(`${d} is not a Saturday`);
  }
  const timezone = text(formData, "timezone", 60);
  if (!TIMEZONES.some((t) => t.value === timezone)) throw new Error("Pick a timezone");
  await prisma.shul.update({
    where: { id: shul.id },
    data: { shabbosDates: dates.join(","), timezone, tzOffset: utcOffsetOn(timezone, dates[0]) },
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

const LOGO_KINDS = ["logoDark", "logoLight", "partnerLogoDark", "partnerLogoLight"] as const;
type LogoKind = (typeof LOGO_KINDS)[number];
const LOGO_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function uploadLogoAction(formData: FormData) {
  const shul = await requireAdmin();
  const kind = text(formData, "kind", 30) as LogoKind;
  if (!LOGO_KINDS.includes(kind)) return;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose an image file");
  if (!LOGO_MIMES.has(file.type)) throw new Error("PNG, JPEG, WebP or SVG only");
  if (file.size > 600 * 1024) throw new Error("Keep the image under 600 KB");
  const data = Buffer.from(await file.arrayBuffer());
  const asset = await prisma.shulAsset.create({
    data: { shulId: shul.id, kind, mime: file.type, data },
  });
  // Drop the previous upload for this slot, if any.
  await prisma.shulAsset.deleteMany({ where: { shulId: shul.id, kind, id: { not: asset.id } } });
  await prisma.shul.update({ where: { id: shul.id }, data: { [kind]: `/api/logo/${asset.id}` } });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function removeLogoAction(formData: FormData) {
  const shul = await requireAdmin();
  const kind = text(formData, "kind", 30) as LogoKind;
  if (!LOGO_KINDS.includes(kind)) return;
  await prisma.shulAsset.deleteMany({ where: { shulId: shul.id, kind } });
  await prisma.shul.update({ where: { id: shul.id }, data: { [kind]: null } });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function changePasswordAction(formData: FormData) {
  const shul = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (shulAdminHash(shul.slug, current) !== shul.adminHash) throw new Error("Current password is wrong");
  if (next.length < 8) throw new Error("New password needs 8+ characters");
  const adminHash = shulAdminHash(shul.slug, next);
  await prisma.shul.update({ where: { id: shul.id }, data: { adminHash } });
  await grantAdmin({ ...shul, adminHash }, next); // keep this browser logged in
  revalidatePath("/admin");
}

export async function sendCustomBlastAction(formData: FormData) {
  const shul = await requireAdmin();
  const subject = text(formData, "subject", 120);
  const body = text(formData, "body", 3000);
  const audience = formData.get("audience") === "unchecked" ? "unchecked" : "all";
  if (!subject || !body) throw new Error("Subject and message are required");
  await runCustomBlastForShul(shul, subject, body, audience);
  revalidatePath("/admin");
}

// ---------- housekeeping ----------
import { auditShul, auditReport } from "@/lib/housekeeping";

/** Removes the safe leftovers: families with nobody in them, and people
 * who never chose a commitment (a signup abandoned halfway). */
export async function cleanupAbandonedAction() {
  const shul = await requireAdmin();
  const audit = await auditShul(shul.id);
  for (const h of audit.emptyHouseholds) {
    await prisma.messageLog.deleteMany({ where: { householdId: h.id } });
    await prisma.household.delete({ where: { id: h.id } }).catch(() => {});
  }
  for (const { household, member } of audit.membersWithoutGoals) {
    await prisma.member.delete({ where: { id: member.id } }).catch(() => {});
    const left = await prisma.member.count({ where: { householdId: household.id } });
    if (left === 0) {
      await prisma.messageLog.deleteMany({ where: { householdId: household.id } });
      await prisma.household.delete({ where: { id: household.id } }).catch(() => {});
    }
  }
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/families");
}

export async function emailAuditAction() {
  const shul = await requireAdmin();
  const to = shul.contactEmail;
  if (!to) throw new Error("Set your organizer email in Campaign settings first");
  const audit = await auditShul(shul.id);
  await sendPlatformEmail([to], `Housekeeping report — ${shul.name}`, auditReport(audit, shulBaseUrl(shul)));
  revalidatePath("/admin");
}

export async function requestChangeAction(formData: FormData) {
  const shul = await requireAdmin();
  const message = text(formData, "message", 4000);
  const from = text(formData, "email", 120) || shul.contactEmail || "";
  if (!message) throw new Error("Describe what you need");
  const ok = await sendPlatformEmail(
    [PLATFORM.contactEmail],
    `[${shul.slug}] Change request from ${shul.name}`,
    [
      `Shul: ${shul.name} (${shul.slug}) — ${shulBaseUrl(shul)}`,
      `From: ${shul.contactName ?? ""} <${from}>`,
      `Admin page: ${shulBaseUrl(shul)}/admin`,
      ``,
      `Request:`,
      message,
    ].join("\n")
  );
  if (!ok && process.env.NODE_ENV === "production") {
    throw new Error("Couldn't send just now — email us directly instead");
  }
  revalidatePath("/admin");
}
