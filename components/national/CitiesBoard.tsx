import Link from "next/link";
import type { CityRow } from "@/lib/directory";

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

/** Where people are signing up from. Every card opens that city's page. */
export default function CitiesBoard({ cities, compact = false }: { cities: CityRow[]; compact?: boolean }) {
  if (cities.length === 0) {
    return (
      <p className="text-center text-ink-soft italic">
        The first families are signing up now — your city could be first on the board.
      </p>
    );
  }
  const list = compact ? cities.slice(0, 12) : cities;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((c) => {
        const top = c.highlights[0];
        return (
          <Link
            key={c.slug}
            href={`/whos-in/${c.slug}`}
            className="group block bg-white rounded-xl border border-parchment px-5 py-4 hover:border-gold hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-navy group-hover:text-gold-deep transition-colors">{c.city}</div>
                {c.region && <div className="text-xs text-ink-soft">{c.region}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-2xl text-gold tabular-nums leading-none">{c.people.toLocaleString()}</div>
                <div className="text-xs text-ink-soft mt-1">{c.people === 1 ? "person" : "people"} · {plural(c.families, "family", "families")}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              {top ? (
                <span className="text-navy">
                  <span className="font-display text-base text-gold mr-1 tabular-nums">{top.value.toLocaleString()}</span>
                  {top.label}
                </span>
              ) : (
                <span className="text-ink-soft italic">first Shabbos coming up</span>
              )}
              <span className="text-ink-soft group-hover:text-gold-deep whitespace-nowrap">See who&rsquo;s in →</span>
            </div>
          </Link>
        );
      })}
      {compact && cities.length > list.length && (
        <Link href="/whos-in" className="flex items-center justify-center rounded-xl border border-dashed border-parchment px-5 py-4 text-navy hover:border-gold hover:text-gold-deep transition-colors">
          + {cities.length - list.length} more {cities.length - list.length === 1 ? "city" : "cities"} →
        </Link>
      )}
    </div>
  );
}
