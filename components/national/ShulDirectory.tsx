import { shulBaseUrl } from "@/lib/tenant";

export type DirectoryShul = {
  id: string;
  slug: string;
  customDomain: string | null;
  name: string;
  city: string;
  state: string | null;
  partnerName: string | null;
  people: number;
  families: number;
};

function groupKey(s: DirectoryShul): string {
  return s.state ? `${s.city}, ${s.state}` : s.city;
}

/** Directory of live shuls, grouped by city. */
export default function ShulDirectory({ shuls, compact = false }: { shuls: DirectoryShul[]; compact?: boolean }) {
  const groups = new Map<string, DirectoryShul[]>();
  for (const s of shuls) {
    const k = groupKey(s);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const ordered = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  if (shuls.length === 0) {
    return (
      <p className="text-center text-ink-soft italic">
        The first shuls are setting up now — yours could be on this list tonight.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {ordered.map(([city, list]) => (
        <div key={city}>
          <h3 className="font-display text-lg text-navy mb-3 flex items-center gap-2">
            <span className="text-gold">📍</span> {city}
          </h3>
          <div className={`grid grid-cols-1 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
            {list.map((s) => (
              <a
                key={s.id}
                href={shulBaseUrl(s)}
                className="block bg-white rounded-xl border border-parchment shadow-sm px-5 py-4 hover:border-gold-soft transition-colors"
              >
                <div className="font-semibold text-navy">{s.name}</div>
                {s.partnerName && (
                  <div className="text-xs text-ink-soft">with {s.partnerName}</div>
                )}
                <div className="text-sm text-ink-soft mt-1">
                  {s.people > 0
                    ? `${s.people.toLocaleString()} ${s.people === 1 ? "person" : "people"} · ${s.families.toLocaleString()} ${s.families === 1 ? "family" : "families"}`
                    : "Just getting started"}
                </div>
                <div className="text-xs text-gold font-semibold mt-2">
                  {s.customDomain ?? `${s.slug}.${shulBaseUrl(s).replace(/^https?:\/\/[^.]+\./, "").replace(/:\d+$/, "")}`} →
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
