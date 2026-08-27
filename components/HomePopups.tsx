"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Step = "link" | "dvar" | null;

const LINK_SEEN_KEY = "linkWelcome";
const DVAR_SEEN_KEY = "dvarHalachaPopup";

function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // no localStorage — don't nag, just skip
  }
}
function markSeen(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {}
}

/**
 * One popup at a time on the homepage, shown once per device each:
 * 1. LINK Kollel welcome (only if this shul has a partner community set)
 * 2. The new Dvar Halacha announcement
 * Dismissing one immediately reveals the next unseen one, so they never
 * stack — and the sticky join bar's own popup stands down while either is up.
 */
export default function HomePopups({ partnerName }: { partnerName?: string }) {
  const [step, setStep] = useState<Step>(null);

  useEffect(() => {
    const needLink = !!partnerName && !seen(LINK_SEEN_KEY);
    const needDvar = !seen(DVAR_SEEN_KEY);
    const first: Step = needLink ? "link" : needDvar ? "dvar" : null;
    if (!first) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem("joinNudge", "1");
      } catch {}
      setStep(first);
    }, first === "link" ? 800 : 1200);
    return () => clearTimeout(t);
  }, [partnerName]);

  function dismissLink() {
    markSeen(LINK_SEEN_KEY);
    setStep(seen(DVAR_SEEN_KEY) ? null : "dvar");
  }
  function dismissDvar() {
    markSeen(DVAR_SEEN_KEY);
    setStep(null);
  }

  if (step === "link") {
    const shortName = (partnerName ?? "").replace(/\s+Kollel$/i, "");
    return (
      <div
        className="fixed inset-0 z-50 bg-navy-deep/75 flex items-center justify-center p-4"
        onClick={dismissLink}
      >
        <div
          className="bg-cream rounded-2xl max-w-md w-full p-8 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-3">🕯️✨</div>
          <p className="font-display tracking-[0.22em] uppercase text-sm text-gold mb-2">
            The Elul Shabbos Project
          </p>
          <h2 className="font-display text-3xl text-navy mb-3">
            Welcome, {shortName} Community!
          </h2>
          <p className="text-ink-soft mb-5">
            {partnerName} has joined the Elul Shabbos Project — one more
            community holding Shabbos together through the Yamim Noraim.
          </p>
          <div className="font-display text-navy-deep text-lg leading-relaxed mb-6">
            <p>Thank You Hashem for Yidden.</p>
            <p>Thank You Hashem for Elul.</p>
            <p>Thank You Hashem for Shabbos.</p>
          </div>
          <Link
            href="/signup"
            onClick={dismissLink}
            className="block bg-gold text-navy-deep font-bold rounded-lg py-3.5 text-lg hover:bg-gold-soft transition-colors mb-3"
          >
            Join the campaign
          </Link>
          <button
            onClick={dismissLink}
            className="text-sm text-ink-soft underline hover:text-navy"
          >
            Continue to the site
          </button>
        </div>
      </div>
    );
  }

  if (step === "dvar") {
    return (
      <div
        className="fixed inset-0 z-50 bg-navy-deep/75 flex items-center justify-center p-4"
        onClick={dismissDvar}
      >
        <div
          className="bg-cream rounded-2xl max-w-md w-full p-8 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-3">📖</div>
          <p className="font-display tracking-[0.22em] uppercase text-sm text-gold mb-2">
            New This Week
          </p>
          <h2 className="font-display text-2xl text-navy mb-2">
            The Broken Water Heater
          </h2>
          <p className="text-sm text-ink-soft mb-1">
            A Dvar Halacha by <strong className="text-navy">Rabbi Yisroel Casen</strong>
          </p>
          <p className="text-ink-soft mb-6">
            A real-life shailah on melacha, maris ayin, and a mid-Shabbos
            repair call — bring it to your table this week.
          </p>
          <a
            href="/dvar-halacha-broken-water-heater.pdf"
            target="_blank"
            onClick={dismissDvar}
            className="block bg-gold text-navy-deep font-bold rounded-lg py-3.5 text-lg hover:bg-gold-soft transition-colors mb-3"
          >
            Download the PDF
          </a>
          <button
            onClick={dismissDvar}
            className="text-sm text-ink-soft underline hover:text-navy"
          >
            Continue to the site
          </button>
        </div>
      </div>
    );
  }

  return null;
}
