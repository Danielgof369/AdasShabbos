"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Aggressive-but-polite signup push on the homepage:
 * - always-visible sticky "Join" bar at the bottom
 * - one-time popup a few seconds in (dismissed = remembered for the session)
 */
export default function JoinNudge() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("joinNudge") === "1") return;
    } catch {}
    const t = setTimeout(() => setShowPopup(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShowPopup(false);
    try {
      sessionStorage.setItem("joinNudge", "1");
    } catch {}
  };

  return (
    <>
      {/* Sticky join bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-navy-deep/95 border-t border-gold/40 px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <span className="hidden sm:block text-cream/85 text-sm flex-1">
            One small thing for Shabbos. Every signup sends $5 to Tomchei Shabbos.
          </span>
          <Link
            href="/signup"
            className="flex-1 sm:flex-none bg-gold text-navy-deep text-center font-bold rounded-lg px-8 py-3 text-lg hover:bg-gold-soft transition-colors"
          >
            Join the campaign
          </Link>
        </div>
      </div>

      {/* One-time popup */}
      {showPopup && (
        <div
          className="fixed inset-0 z-50 bg-navy-deep/70 flex items-center justify-center p-4"
          onClick={dismiss}
        >
          <div
            className="bg-cream rounded-2xl max-w-sm w-full p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">🕯️</div>
            <h2 className="font-display text-2xl text-navy mb-2">
              Take on one small thing
            </h2>
            <p className="text-ink-soft text-sm mb-5">
              30 seconds to sign up your whole family — and $5 goes to Tomchei
              Shabbos for every person the moment you do.
            </p>
            <Link
              href="/signup"
              className="block bg-gold text-navy-deep font-bold rounded-lg py-3.5 text-lg hover:bg-gold-soft transition-colors mb-3"
            >
              Join now
            </Link>
            <button
              onClick={dismiss}
              className="text-sm text-ink-soft underline hover:text-navy"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
}
