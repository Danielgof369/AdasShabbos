"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberGoalView, SuggestionOption } from "@/lib/types";

function ProgressRow({
  history,
  totalWeeks,
}: {
  history: MemberGoalView["history"];
  totalWeeks: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {history.map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className={
              "size-7 rounded-full flex items-center justify-center text-xs font-semibold border " +
              (h === "done"
                ? "bg-gold text-navy-deep border-gold"
                : h === "set"
                  ? "bg-white text-navy border-navy/40"
                  : h === "missed"
                    ? "bg-parchment text-ink-soft border-parchment"
                    : "bg-transparent text-ink-soft/50 border-parchment")
            }
            title={`Week ${i + 1}`}
          >
            {h === "done" ? "✓" : i + 1}
          </div>
        </div>
      ))}
      <span className="text-xs text-ink-soft ml-1">of {totalWeeks} weeks</span>
    </div>
  );
}

function GoalPicker({
  suggestions,
  isChild,
  lastTitle,
  onPick,
  busy,
}: {
  suggestions: SuggestionOption[];
  isChild: boolean;
  lastTitle: string | null;
  onPick: (choice: { suggestionId?: string; customTitle?: string; sameAgain?: boolean }) => void;
  busy: boolean;
}) {
  const [useCustom, setUseCustom] = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <div>
      {lastTitle && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onPick({ sameAgain: true })}
          className="w-full mb-2 rounded-lg border-2 border-gold bg-gold-pale px-3.5 py-3 text-sm font-medium text-navy-deep hover:bg-gold-soft/40 transition-colors disabled:opacity-60"
        >
          🔁 Same as last time: {lastTitle}
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions
          .filter((s) => !isChild || s.kidFriendly)
          .map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => onPick({ suggestionId: s.id })}
              className="text-left rounded-lg border border-parchment bg-cream px-3.5 py-2.5 text-sm hover:border-gold-soft transition-colors disabled:opacity-60"
            >
              {s.title}
            </button>
          ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => setUseCustom(true)}
          className={`text-left rounded-lg border px-3.5 py-2.5 text-sm transition-colors disabled:opacity-60 ${
            useCustom
              ? "border-gold bg-gold-pale font-medium text-navy-deep"
              : "border-parchment bg-cream hover:border-gold-soft"
          }`}
        >
          ✏️ My own idea…
        </button>
      </div>
      {useCustom && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            autoFocus
            placeholder="What will you take on?"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="flex-1 rounded-lg border border-gold-soft bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold"
          />
          <button
            type="button"
            disabled={busy || !custom.trim()}
            onClick={() => onPick({ customTitle: custom.trim() })}
            className="bg-navy text-cream rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-navy-soft transition-colors disabled:opacity-60"
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}

export default function CheckinClient({
  token,
  members,
  suggestions,
  totalWeeks,
}: {
  token: string;
  members: MemberGoalView[];
  suggestions: SuggestionOption[];
  totalWeeks: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<Record<string, boolean>>({});
  const [pickerOpen, setPickerOpen] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  async function post(url: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong — try again.");
      }
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function checkIn(m: MemberGoalView) {
    if (!m.pending) return;
    const ok = await post("/api/checkin", { token, goalId: m.pending.goalId });
    if (ok) {
      setCelebrating((c) => ({ ...c, [m.memberId]: true }));
      setPickerOpen((p) => ({ ...p, [m.memberId]: true }));
    }
  }

  async function setGoal(
    m: MemberGoalView,
    week: number,
    choice: { suggestionId?: string; customTitle?: string; sameAgain?: boolean }
  ) {
    const ok = await post("/api/goal", {
      token,
      memberId: m.memberId,
      week,
      ...choice,
    });
    if (ok) setPickerOpen((p) => ({ ...p, [m.memberId]: false }));
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {members.map((m) => {
        const showPending = m.pending && !dismissed[m.memberId];
        const wantsPicker =
          m.nextGoalWeek !== null &&
          (!m.upcoming || pickerOpen[m.memberId]) &&
          (pickerOpen[m.memberId] || !m.upcoming);

        return (
          <section
            key={m.memberId}
            className="bg-white rounded-2xl border border-parchment shadow-sm p-5 sm:p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl text-navy">
                {m.name}
                {m.isChild && (
                  <span className="ml-2 text-xs align-middle bg-gold-pale text-navy-deep rounded-full px-2 py-0.5">
                    kid
                  </span>
                )}
              </h2>
            </div>
            <div className="mb-4">
              <ProgressRow history={m.history} totalWeeks={totalWeeks} />
            </div>

            {celebrating[m.memberId] && (
              <div className="mb-4 rounded-lg bg-gold-pale border border-gold/40 px-4 py-3 text-navy-deep text-sm">
                🎉 <strong>Beautiful!</strong> Another $1 goes to Tomchei
                Shabbos, and the shul-wide count just went up.
              </div>
            )}

            {showPending && m.pending && (
              <div className="mb-4 rounded-xl border border-navy/15 bg-cream p-4">
                <p className="text-xs uppercase tracking-wide text-ink-soft mb-1">
                  Week {m.pending.week} · Shabbos {m.pending.shabbosLabel}
                </p>
                <p className="font-medium text-navy mb-3">{m.pending.title}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => checkIn(m)}
                    className="bg-gold text-navy-deep font-semibold rounded-lg px-6 py-2.5 hover:bg-gold-soft transition-colors disabled:opacity-60"
                  >
                    ✓ I did it!
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setDismissed((d) => ({ ...d, [m.memberId]: true }))
                    }
                    className="text-sm text-ink-soft underline hover:text-navy"
                  >
                    Not this week
                  </button>
                </div>
              </div>
            )}

            {m.upcoming && !pickerOpen[m.memberId] && (
              <div className="rounded-xl border border-parchment bg-parchment/40 p-4">
                <p className="text-xs uppercase tracking-wide text-ink-soft mb-1">
                  This Shabbos · {m.upcoming.shabbosLabel}
                </p>
                <p className="font-medium text-navy">{m.upcoming.title}</p>
                <button
                  type="button"
                  onClick={() =>
                    setPickerOpen((p) => ({ ...p, [m.memberId]: true }))
                  }
                  className="mt-2 text-sm text-ink-soft underline hover:text-navy"
                >
                  Change it up
                </button>
              </div>
            )}

            {wantsPicker && m.nextGoalWeek !== null && (
              <div className="rounded-xl border border-gold/40 bg-white p-4">
                <p className="text-sm font-medium text-navy mb-3">
                  {m.upcoming ? "Switch" : "Set"} {m.name}&rsquo;s commitment for
                  week {m.nextGoalWeek}:
                </p>
                <GoalPicker
                  suggestions={suggestions}
                  isChild={m.isChild}
                  lastTitle={m.lastTitle}
                  busy={busy}
                  onPick={(choice) => setGoal(m, m.nextGoalWeek!, choice)}
                />
                {m.upcoming && (
                  <button
                    type="button"
                    onClick={() =>
                      setPickerOpen((p) => ({ ...p, [m.memberId]: false }))
                    }
                    className="mt-3 text-sm text-ink-soft underline hover:text-navy"
                  >
                    Never mind, keep it
                  </button>
                )}
              </div>
            )}

            {m.nextGoalWeek === null && !m.pending && (
              <p className="text-sm text-ink-soft">
                The campaign has wrapped up — thank you for being part of it!
              </p>
            )}
          </section>
        );
      })}

      <p className="text-center text-sm text-ink-soft pb-4">
        Want to add another family member?{" "}
        <a href="/signup" className="underline hover:text-navy">
          Sign them up here
        </a>{" "}
        with the same phone or email.
      </p>
    </div>
  );
}
