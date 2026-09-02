"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type PickerShul = { id: string; slug: string; name: string; city: string; state: string | null; hasSite: boolean };

const inputCls =
  "w-full rounded-lg border border-parchment bg-white px-4 py-3 outline-none focus:border-gold";

/** Step one of the national signup: which shul are you part of? */
export default function ShulPicker({ shuls }: { shuls: PickerShul[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = n
      ? shuls.filter((s) => `${s.name} ${s.city} ${s.state ?? ""}`.toLowerCase().includes(n))
      : shuls;
    return list.slice(0, 12);
  }, [q, shuls]);

  async function addShul(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shuls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, state }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push(`/join?shul=${encodeURIComponent(data.shul.slug)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-parchment shadow-sm p-6 sm:p-7">
      <h2 className="font-display text-xl text-navy mb-1">Which shul are you part of?</h2>
      <p className="text-sm text-ink-soft mb-4">
        Your family counts toward your shul&rsquo;s page. Start typing to find it.
      </p>
      {!adding ? (
        <>
          <input
            className={inputCls}
            placeholder="Shul name or city"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <ul className="mt-3 divide-y divide-parchment rounded-lg border border-parchment overflow-hidden">
            {matches.map((s) => (
              <li key={s.id}>
                {s.hasSite ? (
                  <a
                    href={`https://${s.slug}.${typeof window !== "undefined" ? window.location.host.replace(/^www\./, "") : ""}/signup`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gold-pale/40"
                  >
                    <span>
                      <span className="font-medium text-navy">{s.name}</span>
                      <span className="text-sm text-ink-soft"> · {s.city}{s.state ? `, ${s.state}` : ""}</span>
                    </span>
                    <span className="text-xs text-gold font-semibold">their site →</span>
                  </a>
                ) : (
                  <a
                    href={`/join?shul=${encodeURIComponent(s.slug)}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gold-pale/40"
                  >
                    <span>
                      <span className="font-medium text-navy">{s.name}</span>
                      <span className="text-sm text-ink-soft"> · {s.city}{s.state ? `, ${s.state}` : ""}</span>
                    </span>
                    <span className="text-xs text-gold font-semibold">choose →</span>
                  </a>
                )}
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-4 py-3 text-sm text-ink-soft">No shul matches &ldquo;{q}&rdquo; yet.</li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setName(q);
            }}
            className="mt-4 text-sm text-navy underline underline-offset-2 hover:text-gold"
          >
            My shul isn&rsquo;t listed — add it
          </button>
        </>
      ) : (
        <form onSubmit={addShul} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Shul name</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Young Israel of Example" required autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-navy mb-1">City</label>
              <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">State</label>
              <input className={inputCls} value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} placeholder="NY" />
            </div>
          </div>
          {error && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="bg-gold text-navy-deep font-semibold rounded-lg px-6 py-3 hover:bg-gold-soft transition-colors disabled:opacity-60">
              {busy ? "Adding…" : "Add my shul & continue"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-ink-soft underline">
              Back to the list
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
