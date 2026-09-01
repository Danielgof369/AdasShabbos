import Link from "next/link";
import type { Shul } from "@prisma/client";

/** What visitors see at a shul that hasn't been approved yet. */
export default function PendingApproval({ shul }: { shul: Shul }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="text-5xl mb-4">🕯️</div>
      <h1 className="font-display text-3xl text-navy mb-3">
        {shul.name} is almost ready
      </h1>
      <p className="text-ink-soft mb-8">
        This campaign is being set up and will open shortly. Check back soon,
        or ask your shul&rsquo;s organizer for the announcement.
      </p>
      <Link
        href="/admin"
        className="text-sm text-ink-soft underline underline-offset-2 hover:text-navy"
      >
        Organizer? Sign in to your admin page
      </Link>
    </div>
  );
}
