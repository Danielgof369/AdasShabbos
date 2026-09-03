import { prisma } from "@/lib/db";
import { campaignOf, activeWeek, checkinDeadline } from "@/lib/campaign";
import type { Shul } from "@/lib/tenant";
import { lastShabbosWeek } from "@/lib/household";
import { normalizePhone, normalizeEmail } from "@/lib/contact";
import { isCategory, isChildCategory } from "@/lib/categories";
import { sendWelcome } from "@/lib/welcome";
import { AVATAR_BY_ID } from "@/lib/avatars";
import { ALL_CITIES, regionOf } from "@/lib/cities";
import { forget } from "@/lib/memo";

export type SignupBody = {
  familyName?: unknown;
  phone?: unknown;
  email?: unknown;
  emails?: unknown;
  members?: unknown;
  shulId?: unknown;
  shulNote?: unknown;
  city?: unknown;
};

type MemberInput = {
  name?: unknown;
  category?: unknown;
  avatar?: unknown;
  suggestionIds?: unknown;
  customTitle?: unknown;
};

export type SignupResult = { ok: true; token: string } | { ok: false; error: string };
const fail = (o: { error: string }): SignupResult => ({ ok: false, error: o.error });

/**
 * Sign a household up to a shul: validates, reuses an existing household
 * for the same contact, creates members and their goals for every remaining
 * week, and sends the welcome email. Used by the shul-site signup and the
 * national signup alike.
 */
export async function createSignup(shul: Shul, body: SignupBody): Promise<SignupResult> {
  const familyName =
    typeof body.familyName === "string" ? body.familyName.trim().slice(0, 60) : "";
  if (!familyName) {
    return fail({ error: "Please provide your family (last) name." });
  }

  const rawEmails = Array.isArray(body.emails)
    ? (body.emails as unknown[]).filter((e): e is string => typeof e === "string")
    : typeof body.email === "string"
      ? [body.email]
      : [];
  const emails: string[] = [];
  for (const raw of rawEmails.slice(0, 3)) {
    if (!raw.trim()) continue;
    const normalized = normalizeEmail(raw);
    if (!normalized) {
      return fail({ error: `"${raw.trim()}" doesn't look like a valid email — please double-check it.` });
    }
    if (!emails.includes(normalized)) emails.push(normalized);
  }
  const email = emails[0] ?? null;
  if (!email) {
    return fail({ error: "Please provide a valid email — that's where your weekly reminders go." });
  }

  const shulNote = typeof body.shulNote === "string" ? body.shulNote.trim().slice(0, 120) || null : null;
  // City: a dropdown pick, or "Other: <text>" from the free-text fallback.
  const rawCity = typeof body.city === "string" ? body.city.trim().slice(0, 80) : "";
  const city = rawCity ? (ALL_CITIES.has(rawCity) ? rawCity : rawCity.replace(/^Other:\s*/i, "").trim() || null) : null;
  const region = city ? regionOf(city) : null;
  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) {
    return fail({ error: "That phone number doesn't look right — please double-check it." });
  }

  const members = Array.isArray(body.members) ? (body.members as MemberInput[]) : [];
  if (members.length === 0 || members.length > 15) {
    return fail({ error: "Please add at least one person." });
  }

  const campaign = campaignOf(shul);
  // Families joining off the Motzei Shabbos/Sunday blast still get the
  // just-passed Shabbos while its check-in window is open (through Monday
  // night) — otherwise their page has nothing to check in for.
  const nowWeek = activeWeek(campaign);
  const lastWeek = lastShabbosWeek(campaign);
  const week =
    lastWeek >= 1 &&
    lastWeek < nowWeek &&
    Date.now() <= checkinDeadline(campaign, lastWeek).getTime()
      ? lastWeek
      : nowWeek;

  const validSuggestionIds = new Set(
    (
      await prisma.suggestion.findMany({
        where: { shulId: shul.id, active: true },
        select: { id: true },
      })
    ).map((s) => s.id)
  );

  const cleanMembers: {
    name: string;
    category: "man" | "woman" | "boy" | "girl";
    avatar: string | null;
    suggestionIds: string[];
    customTitle: string | null;
  }[] = [];
  for (const m of members) {
    const name = typeof m.name === "string" ? m.name.trim().slice(0, 60) : "";
    if (!name) {
      return fail({ error: "Every person needs a first name." });
    }
    // An avatar id carries its own group; the category falls back to it.
    const avatarDef = typeof m.avatar === "string" ? AVATAR_BY_ID.get(m.avatar) ?? null : null;
    if (!isCategory(m.category) && avatarDef) m.category = avatarDef.group;
    if (!isCategory(m.category)) {
      return fail({ error: `Choose adult or child for ${name}.` });
    }
    const suggestionIds = (Array.isArray(m.suggestionIds) ? m.suggestionIds : [])
      .filter((id): id is string => typeof id === "string" && validSuggestionIds.has(id))
      .slice(0, 6);
    const customTitle =
      typeof m.customTitle === "string" && m.customTitle.trim()
        ? m.customTitle.trim().slice(0, 120)
        : null;
    if (suggestionIds.length === 0 && !customTitle) {
      return fail({ error: `Pick at least one commitment for ${name}.` });
    }
    cleanMembers.push({ name, category: m.category, avatar: avatarDef?.id ?? null, suggestionIds, customTitle });
  }

  // Reuse an existing household for the same contact so families can add
  // people later without splitting their check-in link.
  const existing = await prisma.household.findFirst({
    where: {
      shulId: shul.id,
      OR: [
        ...emails.flatMap((e) => [{ email: e }, { email2: e }, { email3: e }]),
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  // Friendly personal link: /c/theirname, with a number appended for
  // duplicate family names (gofman, gofman2, ...).
  async function slugToken(name: string): Promise<string> {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, "") || "family";
    for (let n = 1; n < 100; n++) {
      const candidate = n === 1 ? base : `${base}${n}`;
      const taken = shul.hasSite
        ? await prisma.household.findUnique({
            where: { shulId_token: { shulId: shul.id, token: candidate } },
          })
        : await prisma.household.findFirst({
            where: { token: candidate, shul: { hasSite: false } },
          });
      if (!taken) return candidate;
    }
    return `${base}${Date.now()}`;
  }

  async function createHousehold() {
    // Retry on the rare launch-night race where two same-named families
    // submit simultaneously and collide on the slug.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.household.create({
          data: {
            shulId: shul.id,
            token: await slugToken(familyName),
            familyName,
            phone,
            email,
            email2: emails[1] ?? null,
            email3: emails[2] ?? null,
            shulNote,
            city,
            region,
          },
        });
      } catch (e) {
        if (attempt === 2) throw e;
      }
    }
    throw new Error("unreachable");
  }

  const household = existing ?? (await createHousehold());

  if (existing) {
    // Fill in any newly provided contact details without overwriting old ones.
    const known = new Set(
      [existing.email, existing.email2, existing.email3].filter(Boolean)
    );
    const fresh = emails.filter((e) => !known.has(e));
    await prisma.household.update({
      where: { id: existing.id },
      data: {
        familyName: existing.familyName ?? familyName,
        phone: existing.phone ?? phone,
        email: existing.email ?? fresh.shift() ?? null,
        email2: existing.email2 ?? fresh.shift() ?? null,
        email3: existing.email3 ?? fresh.shift() ?? null,
        shulNote: existing.shulNote ?? shulNote,
        city: existing.city ?? city,
        region: existing.region ?? region,
      },
    });
  }

  // One commitment set, held for the whole campaign: a goal row per
  // commitment for the current week and every remaining week.
  for (const m of cleanMembers) {
    const member = await prisma.member.create({
      data: {
        householdId: household.id,
        name: m.name,
        gender: m.category,
        avatar: m.avatar,
        isChild: isChildCategory(m.category),
      },
    });
    for (let w = week; w <= campaign.weeks; w++) {
      for (const suggestionId of m.suggestionIds) {
        await prisma.goal.create({ data: { memberId: member.id, week: w, suggestionId } });
      }
      if (m.customTitle) {
        await prisma.goal.create({
          data: { memberId: member.id, week: w, customTitle: m.customTitle },
        });
      }
    }
  }

  // Welcome email with the family's permanent link (first signup only).
  // Awaited on purpose: on serverless hosts a fire-and-forget send can be
  // cut off when the response returns. Failure is logged, never fatal.
  try {
    const outcome = await sendWelcome(shul, household.id, { week });
    if (outcome === "failed") console.error(`[signup] welcome email failed for household ${household.id}`);
  } catch (e) {
    console.error(`[signup] welcome email threw for household ${household.id}:`, e);
  }

  forget("national-stats");
  forget("directory");
  forget("cities");
  return { ok: true, token: household.token };
}
