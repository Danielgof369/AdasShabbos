import Link from "next/link";

export const metadata = {
  title: "Resources | The Elul Shabbos Project",
};

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl sm:text-4xl text-navy mb-2 text-center">
        Resources
      </h1>
      <p className="text-ink-soft text-center mb-10">
        A few things to bring to your Shabbos table this Elul.
      </p>

      <div className="grid grid-cols-1 gap-5">
        <a
          href="/dvar-halacha-broken-water-heater.pdf"
          target="_blank"
          className="block bg-white rounded-2xl border border-parchment shadow-sm p-6 hover:border-gold-soft transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl shrink-0">📖</div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gold font-semibold mb-1">
                Dvar Halacha
              </p>
              <h2 className="font-display text-xl text-navy mb-1">
                The Broken Water Heater
              </h2>
              <p className="text-ink-soft text-sm mb-1">by Rabbi Yisroel Casen</p>
              <p className="text-ink-soft text-sm">
                A real-life shailah on melacha, maris ayin, and a mid-Shabbos
                repair call — a real discussion-starter for the table.
              </p>
              <p className="text-navy text-sm font-semibold underline underline-offset-2 mt-2">
                Download the PDF →
              </p>
            </div>
          </div>
        </a>

        <a
          href="/shabbos-helpers-guide.pdf"
          target="_blank"
          className="block bg-white rounded-2xl border border-parchment shadow-sm p-6 hover:border-gold-soft transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl shrink-0">🖍️</div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gold font-semibold mb-1">
                For Children
              </p>
              <h2 className="font-display text-xl text-navy mb-1">
                The Shabbos Helpers Guide
              </h2>
              <p className="text-ink-soft text-sm">
                Fifteen jobs with titles worth owning — from &ldquo;The Challah
                Helper&rdquo; to &ldquo;The Havdalah Holder&rdquo; — with a
                fridge checklist to go with them.
              </p>
              <p className="text-navy text-sm font-semibold underline underline-offset-2 mt-2">
                Download the PDF →
              </p>
            </div>
          </div>
        </a>
      </div>

      <div className="text-center mt-10">
        <Link
          href="/signup"
          className="inline-block bg-gold text-navy-deep font-semibold rounded-lg px-8 py-3.5 text-lg hover:bg-gold-soft transition-colors"
        >
          Join the campaign
        </Link>
      </div>
    </div>
  );
}
