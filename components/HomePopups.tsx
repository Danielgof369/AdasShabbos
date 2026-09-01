"use client";

import { useEffect, useState } from "react";
import type { Announcement } from "@/lib/copy";

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
 * Homepage announcement popup, shown once per device per edition (the key
 * changes whenever the shul's admin updates the announcement).
 */
export default function HomePopups({ announcement }: { announcement: Announcement | null }) {
  const [show, setShow] = useState(false);
  const storageKey = announcement ? `announcement:${announcement.key}` : null;

  useEffect(() => {
    if (!storageKey || seen(storageKey)) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem("joinNudge", "1");
      } catch {}
      setShow(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [storageKey]);

  if (!show || !announcement || !storageKey) return null;

  function dismiss() {
    markSeen(storageKey!);
    setShow(false);
  }

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
        <h2 className="font-display text-2xl text-navy mb-3">{announcement.title}</h2>
        {announcement.body && (
          <p className="text-ink-soft mb-6 whitespace-pre-line">{announcement.body}</p>
        )}
        {announcement.url && (
          <a
            href={announcement.url}
            target={announcement.url.startsWith("/") && !announcement.url.endsWith(".pdf") ? undefined : "_blank"}
            onClick={dismiss}
            className="block bg-gold text-navy-deep font-bold rounded-lg py-3.5 text-lg hover:bg-gold-soft transition-colors mb-3"
          >
            {announcement.url.endsWith(".pdf") ? "Download the PDF" : "Open"}
          </a>
        )}
        <button onClick={dismiss} className="text-sm text-ink-soft underline hover:text-navy">
          Continue to the site
        </button>
      </div>
    </div>
  );
}
