"use client";

import { useMemo, useState } from "react";

export type PickerShul = { id: string; slug: string; name: string; city: string; state: string | null; hasSite: boolean };

const inputCls =
  "w-full rounded-lg border border-parchment bg-white px-4 py-3 outline-none focus:border-gold";

/** Step one of the national signup: which shul are you part of? */
export default function ShulPicker({ shuls }: { shuls: PickerShul[] }) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = n
      ? shuls.filter((s) => `${s.name} ${s.city} ${s.state ?? ""}`.toLowerCase().includes(n))
      : shuls;
    return list.slice(0, 12);
  }, [q, shuls]);

  return (
    <div className="bg-white rounded-2xl border border-parchment shadow-sm p-6 sm:p-7">
      <h2 className="font-display text-xl text-navy mb-1">Which shul are you part of?</h2>
      <p className="text-sm text-ink-soft mb-4">
        Your family counts toward your shul&rsquo;s page. Start typing to find it.
      </p>
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
      <div className="mt-5 rounded-xl border border-gold/40 bg-gold-pale/40 px-4 py-3">
        <p className="text-sm text-navy font-medium">Don&rsquo;t see your shul? Sign up on your own.</p>
        <p className="text-xs text-ink-soft mb-2">
          Tell us your shul&rsquo;s name as you go and we&rsquo;ll set up its page. Your family moves onto it automatically.
        </p>
        <a
          href={`/join?solo=1${q.trim() ? `&shul=${encodeURIComponent(q.trim())}` : ""}`}
          className="inline-block bg-navy text-cream font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-navy-soft transition-colors"
        >
          Sign up as an individual or family →
        </a>
      </div>
    </div>
  );
}
