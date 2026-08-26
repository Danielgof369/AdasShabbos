"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getShul } from "@/lib/tenant";
import { isAdmin, grantAdmin, revokeAdmin } from "@/lib/adminAuth";
import {
  runThursdayForShul,
  runCheckinForShul,
  runRaffleDeadlineForShul,
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

export async function saveCampaignAction(formData: FormData) {
  const shul = await requireAdmin();
  await prisma.shul.update({
    where: { id: shul.id },
    data: {
      campaignName: String(formData.get("name") ?? shul.campaignName).slice(0, 100),
      charityName: String(formData.get("charityName") ?? shul.charityName).slice(0, 100),
      pledgePerSignup: Math.max(0, Number(formData.get("pledgePerSignup")) || 0),
      partnerName:
        String(formData.get("partnerName") ?? "").trim().slice(0, 100) || null,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/");
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

export async function sendThursdayAction() {
  const shul = await requireAdmin();
  await runThursdayForShul(shul);
  revalidatePath("/admin");
}

export async function sendCheckinAction() {
  const shul = await requireAdmin();
  await runCheckinForShul(shul);
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
