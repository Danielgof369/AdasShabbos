"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  isPlatformAdmin,
  grantPlatformAdmin,
  revokePlatformAdmin,
  shulAdminHash,
} from "@/lib/adminAuth";
import { SUGGESTION_TEMPLATE } from "@/lib/suggestionTemplate";
import { forget } from "@/lib/memo";
import { sendPlatformEmail } from "@/lib/messaging";
import { shulBaseUrl } from "@/lib/tenant";
import { PLATFORM, TIMEZONES, isIsoDate, utcOffsetOn } from "@/lib/platform";
import { saveSeason, getSeason } from "@/lib/season";
import { getIndividualsShul } from "@/lib/individuals";
import { cleanSlug as platformSlug, slugProblem } from "@/lib/platform";

export async function platformLoginAction(formData: FormData) {
  await grantPlatformAdmin(String(formData.get("password") ?? ""));
  revalidatePath("/platform");
}

export async function platformLogoutAction() {
  await revokePlatformAdmin();
  revalidatePath("/platform");
}

async function requirePlatform() {
  if (!(await isPlatformAdmin())) throw new Error("Not authorized");
}

function cleanSlug(raw: string): string {
  return platformSlug(raw);
}

function cleanDates(raw: string): string | null {
  const parts = raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (parts.length < 1 || parts.length > 12) return null;
  if (!parts.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) return null;
  return parts.join(",");
}

export async function createShulAction(formData: FormData) {
  await requirePlatform();

  const slug = cleanSlug(String(formData.get("slug") ?? ""));
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const city = String(formData.get("city") ?? "").trim().slice(0, 100);
  const password = String(formData.get("adminPassword") ?? "");
  const dates = cleanDates(String(formData.get("shabbosDates") ?? ""));
  if (!slug || !name || !city || password.length < 8 || !dates) {
    throw new Error(
      "Need: slug, name, city, admin password (8+ chars), and dates as YYYY-MM-DD,YYYY-MM-DD,…"
    );
  }
  const slugIssue = slugProblem(slug);
  if (slugIssue) throw new Error(`Slug: ${slugIssue}`);

  const shul = await prisma.shul.create({
    data: {
      slug,
      name,
      city,
      state: String(formData.get("state") ?? "").trim().toUpperCase().slice(0, 2) || null,
      contactName: String(formData.get("contactName") ?? "").trim().slice(0, 80) || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim().toLowerCase().slice(0, 120) || null,
      seasonLabel: String(formData.get("seasonLabel") ?? "").trim().slice(0, 40) || "Elul 5786",
      campaignName: String(formData.get("campaignName") ?? "").trim().slice(0, 80) || "Kabbalos Shabbos",
      partnerName: String(formData.get("partnerName") ?? "").trim().slice(0, 100) || null,
      charityName:
        String(formData.get("charityName") ?? "").trim().slice(0, 100) || "Tomchei Shabbos",
      pledgePerSignup: Math.max(0, Number(formData.get("pledgePerSignup")) || 5),
      shabbosDates: dates,
      tzOffset: String(formData.get("tzOffset") ?? "").trim() || "-07:00",
      timezone: String(formData.get("timezone") ?? "").trim() || "America/Los_Angeles",
      customDomain:
        String(formData.get("customDomain") ?? "")
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "") || null,
      adminHash: shulAdminHash(slug, password),
      approved: true,
    },
  });

  // Every new shul starts from the shared commitment template + kids' guide.
  await prisma.suggestion.createMany({
    data: SUGGESTION_TEMPLATE.map((t) => ({ ...t, shulId: shul.id })),
  });
  await prisma.resource.create({
    data: {
      shulId: shul.id,
      kicker: "For Children",
      title: "The Shabbos Helpers Guide",
      description:
        "Fifteen jobs with titles worth owning — from “The Challah Helper” to “The Havdalah Holder” — with a fridge checklist to go with them.",
      url: "/shabbos-helpers-guide.pdf",
      emoji: "🖍️",
      sortOrder: 1,
    },
  });

  forget("directory");
  forget("national-stats");
  revalidatePath("/platform");
}

export async function saveSeasonAction(formData: FormData) {
  await requirePlatform();
  const label = String(formData.get("label") ?? "").trim().slice(0, 40);
  const timezone = String(formData.get("timezone") ?? "").trim();
  const dates = [...new Set(String(formData.get("dates") ?? "").split(/[,\s]+/).map((d) => d.trim()).filter(Boolean))].sort();
  if (!label || dates.length < 1 || dates.length > 20) throw new Error("Label and 1–20 dates required");
  for (const d of dates) {
    if (!isIsoDate(d) || new Date(`${d}T12:00:00Z`).getUTCDay() !== 6) throw new Error(`${d} is not a Saturday (YYYY-MM-DD)`);
  }
  if (!TIMEZONES.some((t) => t.value === timezone)) throw new Error("Pick a timezone");
  await saveSeason({ label, dates, timezone });
  if (formData.get("applyToNational") === "on") {
    // Every shul families created on the national site follows the season.
    await prisma.shul.updateMany({
      where: { hasSite: false },
      data: { seasonLabel: label, shabbosDates: dates.join(","), timezone, tzOffset: utcOffsetOn(timezone, dates[0]) },
    });
  }
  forget("directory");
  forget("national-stats");
  revalidatePath("/platform");
  revalidatePath("/");
}

/** Turn the "my shul is…" notes from individual signups into a real shul
 * and move those families onto it. */
export async function createShulFromRequestsAction(formData: FormData) {
  await requirePlatform();
  const note = String(formData.get("note") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const state = String(formData.get("state") ?? "").trim().toUpperCase().slice(0, 2) || null;
  if (!note || !name || !city) throw new Error("Name and city are required");
  const individuals = await getIndividualsShul();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  let slug = platformSlug(`${name} ${city}`).slice(0, 40).replace(/-+$/, "");
  if (slugProblem(slug)) slug = platformSlug(`shul-${name}`);
  for (let n = 2; await prisma.shul.findUnique({ where: { slug } }); n++) slug = `${platformSlug(name).slice(0, 34)}-${n}`;
  const season = await getSeason();
  const shul = await prisma.shul.create({
    data: {
      slug, name, city, state,
      hasSite: false, approved: true, listed: true,
      campaignName: PLATFORM.name, seasonLabel: season.label,
      shabbosDates: season.dates.join(","), timezone: season.timezone,
      tzOffset: utcOffsetOn(season.timezone, season.dates[0]),
      pledgeEnabled: false, pledgePerSignup: 0, raffleEnabled: false,
      adminHash: shulAdminHash(slug, `${slug}-${Date.now()}-${Math.random()}`),
      suggestions: { createMany: { data: SUGGESTION_TEMPLATE.map((t) => ({ ...t })) } },
    },
  });
  const households = await prisma.household.findMany({ where: { shulId: individuals.id, shulNote: { not: null } } });
  const ids = households.filter((h) => norm(h.shulNote ?? "") === norm(note)).map((h) => h.id);
  if (ids.length) await prisma.household.updateMany({ where: { id: { in: ids } }, data: { shulId: shul.id } });
  forget("directory");
  forget("national-stats");
  revalidatePath("/platform");
  revalidatePath("/");
}

export async function moveRequestsToShulAction(formData: FormData) {
  await requirePlatform();
  const note = String(formData.get("note") ?? "").trim();
  const shulId = String(formData.get("shulId") ?? "");
  if (!note || !shulId) return;
  const individuals = await getIndividualsShul();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const households = await prisma.household.findMany({ where: { shulId: individuals.id, shulNote: { not: null } } });
  const ids = households.filter((h) => norm(h.shulNote ?? "") === norm(note)).map((h) => h.id);
  if (ids.length) await prisma.household.updateMany({ where: { id: { in: ids } }, data: { shulId } });
  forget("directory");
  forget("national-stats");
  revalidatePath("/platform");
}

export async function approveShulAction(formData: FormData) {
  await requirePlatform();
  const id = String(formData.get("id") ?? "");
  const shul = await prisma.shul.findUnique({ where: { id } });
  if (!shul || shul.approved) return;
  await prisma.shul.update({ where: { id }, data: { approved: true, active: true } });
  forget("directory");
  forget("national-stats");
  if (shul.contactEmail) {
    const url = shulBaseUrl(shul);
    await sendPlatformEmail(
      [shul.contactEmail],
      `${shul.name} is approved — you're live on ${PLATFORM.name}`,
      [
        `Good news${shul.contactName ? `, ${shul.contactName}` : ""}: ${shul.name} is approved and open to your families.`,
        ``,
        `Share this link: ${url}`,
        `Your admin page: ${url}/admin`,
        ``,
        `Ready-to-paste announcement for your WhatsApp group:`,
        `🕯️ *${shul.name} — ${shul.campaignName}*`,
        `This ${shul.seasonLabel}, every man, woman and child takes on one small thing for Shabbos. Sign up your whole family in 30 seconds: ${url}`,
        ``,
        `Questions any time: ${PLATFORM.contactEmail}`,
        `— ${PLATFORM.name}`,
      ].join("\n")
    );
  }
  revalidatePath("/platform");
}

export async function updateShulAction(formData: FormData) {
  await requirePlatform();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const shul = await prisma.shul.findUnique({ where: { id } });
  if (!shul) return;

  const dates = cleanDates(String(formData.get("shabbosDates") ?? ""));
  const password = String(formData.get("adminPassword") ?? "");
  await prisma.shul.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? shul.name).trim().slice(0, 100),
      city: String(formData.get("city") ?? shul.city).trim().slice(0, 100),
      state: String(formData.get("state") ?? "").trim().toUpperCase().slice(0, 2) || null,
      contactName: String(formData.get("contactName") ?? "").trim().slice(0, 80) || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim().toLowerCase().slice(0, 120) || null,
      partnerName: String(formData.get("partnerName") ?? "").trim().slice(0, 100) || null,
      listed: formData.get("listed") === "on",
      shabbosDates: dates ?? shul.shabbosDates,
      tzOffset: String(formData.get("tzOffset") ?? shul.tzOffset).trim() || shul.tzOffset,
      timezone: String(formData.get("timezone") ?? shul.timezone).trim() || shul.timezone,
      customDomain:
        String(formData.get("customDomain") ?? "")
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "") || null,
      logoDark: String(formData.get("logoDark") ?? "").trim() || null,
      logoLight: String(formData.get("logoLight") ?? "").trim() || null,
      partnerLogoDark: String(formData.get("partnerLogoDark") ?? "").trim() || null,
      partnerLogoLight: String(formData.get("partnerLogoLight") ?? "").trim() || null,
      active: formData.get("active") === "on",
      ...(password.length >= 8 ? { adminHash: shulAdminHash(shul.slug, password) } : {}),
    },
  });
  revalidatePath("/platform");
}
