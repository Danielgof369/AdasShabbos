"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isAdmin, grantAdmin, revokeAdmin } from "@/lib/adminAuth";
import { runThursdayReminders, runCheckinReminders } from "@/lib/reminders";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  await grantAdmin(password);
  revalidatePath("/admin");
}

export async function logoutAction() {
  await revokeAdmin();
  revalidatePath("/admin");
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorized");
}

export async function saveCampaignAction(formData: FormData) {
  await requireAdmin();
  const startDateStr = String(formData.get("startDate") ?? "");
  const deadlineStr = String(formData.get("signupDeadline") ?? "");
  await prisma.campaign.update({
    where: { id: "campaign" },
    data: {
      name: String(formData.get("name") ?? "The Elul Shabbos Project").slice(0, 100),
      weeks: Math.max(1, Math.min(12, Number(formData.get("weeks")) || 4)),
      // Dates entered in LA time (campaign is LA-based; August offset is -07:00)
      startDate: startDateStr ? new Date(`${startDateStr}T00:00:00-07:00`) : undefined,
      signupDeadline: deadlineStr ? new Date(`${deadlineStr}T19:00:00-07:00`) : null,
      pledgePerSignup: Math.max(0, Number(formData.get("pledgePerSignup")) || 0),
      pledgePerCheckin: Math.max(0, Number(formData.get("pledgePerCheckin")) || 0),
      charityName: String(formData.get("charityName") ?? "Tomchei Shabbos").slice(0, 100),
    },
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveSuggestionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const audienceRaw = String(formData.get("audience") ?? "both");
  const data = {
    title: String(formData.get("title") ?? "").trim().slice(0, 120),
    detail: String(formData.get("detail") ?? "").trim().slice(0, 300) || null,
    unitLabel: String(formData.get("unitLabel") ?? "").trim().slice(0, 80),
    unitValue: Math.max(1, Number(formData.get("unitValue")) || 1),
    audience: ["adult", "kid", "both"].includes(audienceRaw) ? audienceRaw : "both",
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder")) || 0,
  };
  if (!data.title || !data.unitLabel) throw new Error("Title and unit label are required");
  if (id) {
    await prisma.suggestion.update({ where: { id }, data });
  } else {
    await prisma.suggestion.create({ data });
  }
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/signup");
}

export async function deleteSuggestionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
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

export async function sendThursdayAction() {
  await requireAdmin();
  await runThursdayReminders();
  revalidatePath("/admin");
}

export async function sendCheckinAction() {
  await requireAdmin();
  await runCheckinReminders();
  revalidatePath("/admin");
}
