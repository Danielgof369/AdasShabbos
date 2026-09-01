import Link from "next/link";
import { prisma } from "@/lib/db";
import { getShul } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resources",
};

export default async function ResourcesPage() {
  const shul = await getShul();
  const resources = await prisma.resource.findMany({
    where: { shulId: shul.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl sm:text-4xl text-navy mb-2 text-center">
        Resources
      </h1>
      <p className="text-ink-soft text-center mb-10">
        A few things to bring to your Shabbos table.
      </p>

      {resources.length === 0 ? (
        <p className="text-center text-ink-soft italic">Nothing here yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {resources.map((r) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              className="block bg-white rounded-2xl border border-parchment shadow-sm p-6 hover:border-gold-soft transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl shrink-0">{r.emoji}</div>
                <div>
                  {r.kicker && (
                    <p className="text-xs uppercase tracking-wide text-gold font-semibold mb-1">
                      {r.kicker}
                    </p>
                  )}
                  <h2 className="font-display text-xl text-navy mb-1">{r.title}</h2>
                  {r.byline && <p className="text-ink-soft text-sm mb-1">{r.byline}</p>}
                  {r.description && <p className="text-ink-soft text-sm">{r.description}</p>}
                  <p className="text-navy text-sm font-semibold underline underline-offset-2 mt-2">
                    {r.url.endsWith(".pdf") ? "Download the PDF →" : "Open →"}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="text-center mt-10">
        <Link
          href="/signup"
          className="inline-block bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-lg hover:bg-gold-soft transition-colors"
        >
          Join the campaign
        </Link>
      </div>
    </div>
  );
}
