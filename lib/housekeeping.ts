import { prisma } from "@/lib/db";

/**
 * Data-hygiene audit for one shul: the things a real signup night leaves
 * behind — families who quit halfway, the same family signed up twice,
 * the same child added twice, test entries, families we can't reach.
 * Detection only; the admin page offers the fixes.
 */
export type HouseholdLite = {
  id: string;
  token: string;
  familyName: string | null;
  email: string | null;
  email2: string | null;
  email3: string | null;
  phone: string | null;
  createdAt: Date;
  members: { id: string; name: string; goals: number; checkins: number }[];
};

export type DuplicateGroup = {
  reason: string;
  keep: HouseholdLite; // suggested survivor
  others: HouseholdLite[];
};

export type Audit = {
  emptyHouseholds: HouseholdLite[]; // signed up, added nobody
  membersWithoutGoals: { household: HouseholdLite; member: HouseholdLite["members"][number] }[];
  duplicateFamilies: DuplicateGroup[];
  duplicateMembers: { household: HouseholdLite; keep: HouseholdLite["members"][number]; extra: HouseholdLite["members"][number] }[];
  unreachable: HouseholdLite[]; // no email and no phone
  testEntries: HouseholdLite[];
  total: number;
};

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function looksLikeTest(h: HouseholdLite): boolean {
  const name = norm(h.familyName);
  const emails = [h.email, h.email2, h.email3].filter(Boolean).join(" ").toLowerCase();
  return (
    /^(test|testing|asdf|qwerty|abc|xyz|demo|sample|fake)\d*$/.test(name) ||
    /@(example\.com|test\.com|mailinator\.com)|^test@|^asdf/.test(emails) ||
    h.members.some((m) => /^(test|asdf|qwerty|abc)\d*$/i.test(m.name))
  );
}

export async function auditAll(): Promise<Audit> {
  const rows = await prisma.household.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        include: { goals: { select: { checkedInAt: true } } },
        orderBy: { name: "asc" },
      },
    },
  });
  const households: HouseholdLite[] = rows.map((h) => ({
    id: h.id,
    token: h.token,
    familyName: h.familyName,
    email: h.email,
    email2: h.email2,
    email3: h.email3,
    phone: h.phone,
    createdAt: h.createdAt,
    members: h.members.map((m) => ({
      id: m.id,
      name: m.name,
      goals: m.goals.length,
      checkins: m.goals.filter((g) => g.checkedInAt).length,
    })),
  }));

  const emptyHouseholds = households.filter((h) => h.members.length === 0);
  const membersWithoutGoals = households.flatMap((h) =>
    h.members.filter((m) => m.goals === 0).map((member) => ({ household: h, member }))
  );
  const unreachable = households.filter(
    (h) => h.members.length > 0 && !h.email && !h.email2 && !h.email3 && !h.phone
  );
  const testEntries = households.filter(looksLikeTest);

  // Duplicate families: shared contact, or same family name with an
  // overlapping first name (two "Klein" families with a "Yosef" in each).
  const seen = new Set<string>();
  const duplicateFamilies: DuplicateGroup[] = [];
  const score = (h: HouseholdLite) =>
    h.members.reduce((n, m) => n + m.checkins, 0) * 10 + h.members.length;
  const contactsOf = (h: HouseholdLite) =>
    [h.email, h.email2, h.email3, h.phone].filter((c): c is string => !!c).map((c) => c.toLowerCase());
  for (let i = 0; i < households.length; i++) {
    const a = households[i];
    if (seen.has(a.id) || a.members.length === 0) continue;
    const group: HouseholdLite[] = [a];
    let reason = "";
    for (let j = i + 1; j < households.length; j++) {
      const b = households[j];
      if (seen.has(b.id) || b.members.length === 0) continue;
      const sharedContact = contactsOf(a).some((c) => contactsOf(b).includes(c));
      const sameName = norm(a.familyName) && norm(a.familyName) === norm(b.familyName);
      const sharedFirst =
        sameName &&
        a.members.some((m) => b.members.some((n) => norm(n.name) === norm(m.name)));
      if (sharedContact || sharedFirst) {
        group.push(b);
        reason = sharedContact ? "same email or phone" : "same family name and a shared first name";
      }
    }
    if (group.length > 1) {
      group.forEach((h) => seen.add(h.id));
      const [keep, ...others] = [...group].sort((x, y) => score(y) - score(x) || x.createdAt.getTime() - y.createdAt.getTime());
      duplicateFamilies.push({ reason, keep, others });
    }
  }

  const duplicateMembers: Audit["duplicateMembers"] = [];
  for (const h of households) {
    const byName = new Map<string, HouseholdLite["members"]>();
    for (const m of h.members) byName.set(norm(m.name), [...(byName.get(norm(m.name)) ?? []), m]);
    for (const list of byName.values()) {
      if (list.length < 2) continue;
      const [keep, ...extras] = [...list].sort((x, y) => y.checkins - x.checkins || y.goals - x.goals);
      for (const extra of extras) duplicateMembers.push({ household: h, keep, extra });
    }
  }

  return {
    emptyHouseholds,
    membersWithoutGoals,
    duplicateFamilies,
    duplicateMembers,
    unreachable,
    testEntries,
    total:
      emptyHouseholds.length +
      membersWithoutGoals.length +
      duplicateFamilies.length +
      duplicateMembers.length +
      unreachable.length +
      testEntries.length,
  };
}

/** Plain-text version for the "email me this report" button. */
export function auditReport(audit: Audit, siteUrl: string): string {
  const fam = (h: HouseholdLite) =>
    `${h.familyName ?? "(no name)"} · ${h.email ?? h.phone ?? "no contact"} · ${h.members.map((m) => m.name).join(", ") || "nobody"} · ${siteUrl}/c/${h.token}`;
  const lines: string[] = [`Housekeeping report — ${audit.total} item${audit.total === 1 ? "" : "s"}`, ""];
  const section = (title: string, items: string[]) => {
    if (!items.length) return;
    lines.push(`${title} (${items.length})`);
    lines.push(...items.map((s) => `  • ${s}`));
    lines.push("");
  };
  section("Signed up but added nobody", audit.emptyHouseholds.map(fam));
  section("People with no commitment chosen", audit.membersWithoutGoals.map((x) => `${x.member.name} — ${fam(x.household)}`));
  section("Possible duplicate families", audit.duplicateFamilies.map((g) => `${g.reason}: keep ${fam(g.keep)} | fold in ${g.others.map(fam).join(" | ")}`));
  section("Same person listed twice", audit.duplicateMembers.map((x) => `${x.extra.name} twice in ${fam(x.household)}`));
  section("No email or phone on file", audit.unreachable.map(fam));
  section("Looks like a test entry", audit.testEntries.map(fam));
  if (audit.total === 0) lines.push("All clean — nothing to do.");
  lines.push(`Fix any of these from ${siteUrl}/admin → Housekeeping.`);
  return lines.join("\n");
}
