import Link from "next/link";
import type { SuggestionOption } from "@/lib/types";

/** Split the menu into the four columns people recognise from the signup form. */
function menuGroups(menu: SuggestionOption[]) {
  const words = (o: SuggestionOption) => new Set(o.categories.split(",").map((c) => c.trim().toLowerCase()));
  const family = menu.filter((o) => o.tier === "family");
  const rest = menu.filter((o) => o.tier !== "family");
  const children = rest.filter((o) => { const w = words(o); return w.has("child") || w.has("kid") || w.has("boy") || w.has("girl"); });
  const adults = rest.filter((o) => !children.includes(o));
  const men = adults.filter((o) => { const w = words(o); return !w.has("woman") || w.has("man") || w.has("adult") || w.has("both"); });
  const women = adults.filter((o) => { const w = words(o); return !w.has("man") || w.has("woman") || w.has("adult") || w.has("both"); });
  return [
    { title: "For men", blurb: "One person, one kabbalah, every Shabbos.", items: men },
    { title: "For women", blurb: "Your own kabbalah, every Shabbos.", items: women },
    { title: "For children", blurb: "Real jobs with real kavod Shabbos.", items: children },
    { title: "For the whole family", blurb: "Taken on together, at the table.", items: family },
  ].filter((g) => g.items.length > 0);
}

/** "What you can take on": the commitment menu, grouped the way the signup form groups it. */
export default function KabbalosMenu({ menu, seasonLabel, joinHref = "/join", intro }: { menu: SuggestionOption[]; seasonLabel: string; joinHref?: string; intro?: string }) {
  if (menu.length === 0) return null;
  return (
    <section id="kabbalos" className="bg-white border-b border-parchment scroll-mt-16">
      <div className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="font-display text-3xl text-navy mb-2 text-center" style={{ textWrap: "balance" }}>
          What you can take on
        </h2>
        <p className="text-ink-soft text-center mb-10 max-w-2xl mx-auto">
          {intro ?? <>Each person picks one or more of these at signup and holds it every Shabbos of {seasonLabel}. Small on purpose: the point is every week, not once.</>}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {menuGroups(menu).map((g) => (
            <div key={g.title} className="bg-cream rounded-2xl border border-parchment p-5">
              <h3 className="font-display text-xl text-navy mb-1">{g.title}</h3>
              <p className="text-xs text-ink-soft mb-4">{g.blurb}</p>
              <ul className="space-y-3">
                {g.items.map((it) => (
                  <li key={it.id} className="flex gap-2.5">
                    <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                    <div>
                      <div className="text-navy text-sm font-medium leading-snug">{it.title}</div>
                      {it.detail && <div className="text-ink-soft text-xs leading-snug mt-0.5">{it.detail}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-ink-soft text-sm text-center mt-6">Don&rsquo;t see yours? You can write in your own at signup.</p>
        <div className="text-center mt-6">
          <Link href={joinHref} className="inline-block bg-gold text-navy-deep font-bold rounded-lg px-8 py-3.5 text-lg hover:bg-gold-soft transition-colors">
            Sign up and pick yours →
          </Link>
        </div>
      </div>
    </section>
  );
}
