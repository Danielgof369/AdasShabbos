"use client";

import { useState } from "react";
import { audienceMatches, type SuggestionOption } from "@/lib/types";

type PersonDraft = {
  name: string;
  isChild: boolean;
  gender: "boy" | "girl" | null;
  suggestionId: string | null;
  customTitle: string;
  useCustom: boolean;
};

const emptyPerson = (): PersonDraft => ({
  name: "",
  isChild: false,
  gender: null,
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
    if (!phone.trim() && !email.trim()) {
      setError("Please enter a phone number or an email so we can send your reminders.");
      return;
    }
    for (const p of people) {
      if (!p.name.trim()) {
        setError("Please give every person a name.");
        return;
      }
      if (!p.useCustom && !p.suggestionId) {
        setError(`Pick a commitment for ${p.name.trim() || "each person"} — or write your own.`);
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
          phone: phone.trim() || null,
          email: email.trim() || null,
          members: people.map((p) => ({
            name: p.name.trim(),
            isChild: p.isChild,
            gender: p.isChild ? p.gender : null,
            suggestionId: p.useCustom ? null : p.suggestionId,
            customTitle: p.useCustom ? p.customTitle.trim() : null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
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
          We&rsquo;ll remind you on <strong>Thursday</strong> so you&rsquo;re
          ready for Shabbos, and again after Shabbos to check in. Your $5 is on
          its way to Tomchei Shabbos, and every check-in adds another $1.
        </p>
        <div className="bg-parchment/60 rounded-lg p-4 mb-4 text-left">
          <p className="text-sm text-ink-soft mb-1">Your personal check-in link:</p>
          <a href={link} className="text-navy font-medium break-all underline underline-offset-2">
            {link}
          </a>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(link)}
          className="bg-navy text-cream rounded-lg px-6 py-2.5 font-medium hover:bg-navy-soft transition-colors"
        >
          Copy my link
        </button>
        <p className="text-sm text-ink-soft mt-4">
          Every reminder we send includes this link too — no password to remember.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contact */}
      <section className="bg-white rounded-2xl border border-parchment shadow-sm p-5 sm:p-6">
        <h2 className="font-semibold text-navy mb-1">How should we reach you?</h2>
        <p className="text-sm text-ink-soft mb-4">
          Phone gets you text reminders; email works great too. One is enough.
        </p>
        <div className="space-y-3">
          <input
            type="tel"
            inputMode="tel"
            placeholder="Cell phone (for text reminders)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold"
          />
          <input
            type="email"
            inputMode="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <div className="flex gap-3 items-center mb-3">
            <input
              type="text"
              placeholder="First name"
              value={p.name}
              onChange={(e) => updatePerson(i, { name: e.target.value })}
              className="flex-1 rounded-lg border border-parchment bg-cream px-4 py-3 outline-none focus:border-gold"
            />
            <label className="flex items-center gap-2 text-sm text-ink-soft whitespace-nowrap">
              <input
                type="checkbox"
                checked={p.isChild}
                onChange={(e) =>
                  updatePerson(i, {
                    isChild: e.target.checked,
                    gender: e.target.checked ? p.gender : null,
                    suggestionId: null,
                  })
                }
                className="size-4 accent-[#c19a3d]"
              />
              Kid
            </label>
          </div>

          {p.isChild && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-ink-soft">
                For the kids&rsquo; prizes:
              </span>
              {(["boy", "girl"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => updatePerson(i, { gender: g })}
                  className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
                    p.gender === g
                      ? "border-gold bg-gold-pale text-navy-deep font-medium"
                      : "border-parchment bg-cream hover:border-gold-soft"
                  }`}
                >
                  {g === "boy" ? "Boy" : "Girl"}
                </button>
              ))}
            </div>
          )}

          <p className="text-sm text-ink-soft mb-2">
            This week, {p.name.trim() || "they"}&rsquo;ll take on:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions
              .filter((s) => audienceMatches(s.audience, p.isChild))
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
        </section>
      ))}

      <button
        type="button"
        onClick={() => setPeople((ps) => [...ps, emptyPerson()])}
        className="w-full rounded-xl border-2 border-dashed border-gold-soft text-navy py-3.5 font-medium hover:bg-gold-pale transition-colors"
      >
        + Add another person (kids too!)
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
        By signing up you agree to receive weekly reminder messages for this
        campaign. Reply STOP to any text to opt out.
      </p>
    </div>
  );
}
