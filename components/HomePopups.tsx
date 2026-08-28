"use client";

import { useEffect, useState } from "react";

// One block per weekly edition. To publish a new dvar, update these fields —
// the id keys the shown-once-per-device memory, so a new id re-arms the
// popup for every visitor.
const DVAR = {
  id: "broken-water-heater",
  title: "The Broken Water Heater",
  author: "Rabbi Yisroel Casen",
  blurb:
    "A real-life shailah on melacha, maris ayin, and a mid-Shabbos repair call — bring it to your table this week.",
  pdf: "/dvar-halacha-broken-water-heater.pdf",
};

const DVAR_SEEN_KEY = `dvarHalachaPopup:${DVAR.id}`;

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
 * Homepage popup: the Dvar Halacha announcement, shown once per device.
 */
export default function HomePopups() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (seen(DVAR_SEEN_KEY)) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem("joinNudge", "1");
      } catch {}
      setShow(true);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    markSeen(DVAR_SEEN_KEY);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-navy-deep/75 flex items-center justify-center p-4"
      onClick={dismiss}
    >
      <div
        className="bg-cream rounded-2xl max-w-md w-full p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">📖</div>
        <p className="font-display tracking-[0.22em] uppercase text-sm text-gold mb-2">
          New This Week
        </p>
        <h2 className="font-display text-2xl text-navy mb-2">{DVAR.title}</h2>
        <p className="text-sm text-ink-soft mb-1">
          A Dvar Halacha by <strong className="text-navy">{DVAR.author}</strong>
        </p>
        <p className="text-ink-soft mb-6">{DVAR.blurb}</p>
        <a
          href={DVAR.pdf}
          target="_blank"
          onClick={dismiss}
          className="block bg-gold text-navy-deep font-bold rounded-lg py-3.5 text-lg hover:bg-gold-soft transition-colors mb-3"
        >
          Download the PDF
        </a>
        <button
          onClick={dismiss}
          className="text-sm text-ink-soft underline hover:text-navy"
        >
          Continue to the site
        </button>
      </div>
    </div>
  );
}
