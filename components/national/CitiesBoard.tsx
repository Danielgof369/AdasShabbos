import type { CityRow } from "@/lib/directory";

/** Where people are signing up from. */
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
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? "lg:grid-cols-3" : "lg:grid-cols-3"} gap-3`}>
      {list.map((c) => (
        <div key={c.city} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-parchment px-5 py-4">
          <div>
            <div className="font-semibold text-navy">{c.city}</div>
            {c.region && <div className="text-xs text-ink-soft">{c.region}</div>}
          </div>
          <div className="text-right">
            <div className="font-display text-2xl text-gold tabular-nums">{c.people.toLocaleString()}</div>
            <div className="text-xs text-ink-soft">{c.people === 1 ? "person" : "people"} · {c.families} {c.families === 1 ? "family" : "families"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
