import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/adminAuth";
import { campaignOf } from "@/lib/campaign";
import { getShul } from "@/lib/tenant";
import { goalTitle } from "@/lib/household";
import { memberCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

function csvCell(v: string | null | undefined): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const shul = await getShul();
  if (!(await isAdmin(shul))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaign = campaignOf(shul);
  const members = await prisma.member.findMany({
    where: { household: { shulId: shul.id } },
    include: {
      household: true,
      goals: { include: { suggestion: true } },
    },
    orderBy: { name: "asc" },
  });

  const header = [
    "Family",
    "Name",
    "Category",
    "Phone",
    "Email",
    ...Array.from({ length: campaign.weeks }, (_, i) => [
      `Week ${i + 1} commitment`,
      `Week ${i + 1} done`,
    ]).flat(),
  ];

  const rows = members.map((m) => {
    const cells = [
      m.household.familyName ?? "",
      m.name,
      memberCategory(m),
      m.household.phone ?? "",
      [m.household.email, m.household.email2, m.household.email3].filter(Boolean).join("; "),
    ];
    for (let w = 1; w <= campaign.weeks; w++) {
      const g = m.goals.find((g) => g.week === w);
      cells.push(g ? goalTitle(g) : "");
      cells.push(g?.checkedInAt ? "yes" : "");
    }
    return cells.map(csvCell).join(",");
  });

  const csv = [header.map(csvCell).join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="elul-shabbos-signups.csv"`,
    },
  });
}
