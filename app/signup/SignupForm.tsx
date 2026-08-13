"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, categoriesInclude, type Category } from "@/lib/categories";
import type { SuggestionOption } from "@/lib/types";

type PersonDraft = {
  name: string;
  category: Category | null;
  suggestionId: string | null;
  customTitle: string;
  useCustom: boolean;
};

const emptyPerson = (): PersonDraft => ({
  name: "",
  category: null,
  suggestionId: null,
  customTitle: "",
  useCustom: false,
});

export default function SignupForm({
  suggestions,
  week,
}: {
  suggestions: SuggestionOption[];
  week: number;
}) {
  const [familyName, setFamilyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [people, setPeople] = useState<PersonDraft[]>([emptyPerson()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string } | null>(null);

  const updatePerson = (i: number, patch: Partial<PersonDraft>) =>
    setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function submit() {
    setError(null);
    if (!familyName.trim()) {
      setError("Please enter your family (last) name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter an email so we can send your weekly reminders.");
      return;
    }
    for (const p of people) {
      if (!p.name.trim()) {
        setError("Please give every person a first name.");
        return;
      }
      if (!p.category) {
        setError(`Choose man, woman, boy, or girl for ${p.name.trim() || "each person"}.`);
        return;
      }
      if (!p.useCustom && !p.suggestionId) {
        setError(`Pick a commitment for ${p.name.trim()} — or write your own.`);
        return;
      }
      if (p.useCustom && !p.customTitle.trim()) {
        setError(`Write in what ${p.name.trim()} is taking on.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName: familyName.trim(),
          phone: phone.trim() || null,
          email: email.trim(),
          members: people.map((p) => ({
            name: p.name.trim(),
            category: p.category,
            suggestionId: p.useCustom ? null : p.suggestionId,
            customTitle: p.useCustom ? p.customTitle.trim() : null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      try {
        document.cookie = `elul_token=${encodeURIComponent(data.token)}; path=/; max-age=15552000; SameSite=Lax`;
      } catch {}
      setDone({ token: data.token });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const link = `${window.location.origin}/c/${done.token}`;
    return (
      <div className="bg-white rounded-2xl border border-parchment shadow-sm p-6 sm:p-8 text-center">
        <div className="text-5xl mb-4">🕯️</div>
        <h2 className="font-display text-2xl text-navy mb-3">
          You&rsquo;re in — welcome!
        </h2>
        <p className="text-ink-soft mb-6">
          Your family profile is ready. We&rsquo;ll email you a reminder before
          Shabbos, and again afterward to check in. Your $5 per person is on
          its way to Tomchei Shabbos — every check-in adds another $1.
        </p>
        <a
          href={link}
          className="inline-block bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-lg hover:bg-gold-soft transition-colors mb-4"
        >
          See my family profile
        </a>
        <div className="bg-parchment/60 rounded-lg p-4 text-left">
          <p className="text-sm text-ink-soft mb-1">Your personal link (also in every reminder):</p>
          <a href={link} className="text-navy font-medium break-all underline underline-offset-2">
            {link}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contact */}
      <section className="bg-white rounded-2xl border border-parchment shadow-sm p-5 sm:p-6">
        <h2 className="font-semibold text-navy mb-1">Your family</h2>
        <p className="text-sm text-ink-soft mb-4">
          Weekly reminders arrive by email. Phone is optional.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            inputMode="email"
            placeholder="Email (for weekly reminders)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold"
          />
          <input
            type="tel"
            inputMode="tel"
            placeholder="Cell phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold"
          />
          <input
            type="text"
            placeholder="Family (last) name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="w-full rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold"
          />
        </div>
      </section>

      {/* People */}
      {people.map((p, i) => (
        <section
          key={i}
          className="bg-white rounded-2xl border border-parchment shadow-sm p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy">
              {i === 0 ? "Who's signing up?" : `Person ${i + 1}`}
            </h2>
            {i > 0 && (
              <button
                onClick={() => setPeople((ps) => ps.filter((_, j) => j !== i))}
                className="text-sm text-ink-soft hover:text-navy underline"
              >
                Remove
              </button>
            )}
          </div>

          <input
            type="text"
            placeholder="First name"
            value={p.name}
            onChange={(e) => updatePerson(i, { name: e.target.value })}
            className="w-full rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold mb-3"
          />

          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  updatePerson(i, { category: c, suggestionId: null, useCustom: false })
                }
                className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                  p.category === c
                    ? "border-gold bg-gold-pale text-navy-deep font-semibold"
                    : "border-parchment bg-cream hover:border-gold-soft"
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          {p.category ? (
            <>
              <p className="text-sm text-ink-soft mb-2">
                This week, {p.name.trim() || "they"}&rsquo;ll take on:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions
                  .filter((s) => categoriesInclude(s.categories, p.category!))
                  .map((s) => {
                    const selected = !p.useCustom && p.suggestionId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          updatePerson(i, { suggestionId: s.id, useCustom: false })
                        }
                        className={`text-left rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                          selected
                            ? "border-gold bg-gold-pale text-navy-deep font-medium"
                            : "border-parchment bg-cream hover:border-gold-soft"
                        }`}
                      >
                        {s.title}
                      </button>
                    );
                  })}
                <button
                  type="button"
                  onClick={() => updatePerson(i, { useCustom: true, suggestionId: null })}
                  className={`text-left rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                    p.useCustom
                      ? "border-gold bg-gold-pale text-navy-deep font-medium"
                      : "border-parchment bg-cream hover:border-gold-soft"
                  }`}
                >
                  ✏️ My own idea…
                </button>
              </div>
              {p.useCustom && (
                <input
                  type="text"
                  autoFocus
                  placeholder="What will they take on for Shabbos?"
                  value={p.customTitle}
                  onChange={(e) => updatePerson(i, { customTitle: e.target.value })}
                  className="mt-3 w-full rounded-lg border border-gold-soft bg-cream px-4 py-3 outline-none focus:border-gold"
                />
              )}
            </>
          ) : (
            <p className="text-sm text-ink-soft italic">
              Choose Man, Woman, Boy, or Girl to see their commitment options.
            </p>
          )}
        </section>
      ))}

      <button
        type="button"
        onClick={() => setPeople((ps) => [...ps, emptyPerson()])}
        className="w-full rounded-xl border-2 border-dashed border-gold-soft text-navy py-3.5 font-medium hover:bg-gold-pale transition-colors"
      >
        + Add another person
      </button>

      {error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="w-full bg-gold text-navy-deep text-lg font-semibold rounded-xl py-4 hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        {submitting ? "Signing you up…" : `Sign up for week ${week}`}
      </button>
      <p className="text-xs text-ink-soft text-center pb-4">
        By signing up you agree to receive weekly reminder emails for this
        campaign. Unsubscribe anytime.
      </p>
    </div>
  );
}
