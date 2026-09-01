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
      campaignName: String(formData.get("campaignName") ?? "").trim().slice(0, 80) || "Kabbalas Shabbos",
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
