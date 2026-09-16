import Link from "next/link";
import { PARTICIPANTS, type Participant } from "@/lib/participants";

/**
 * "Participating shuls" logo strip in the hero. With enough logos to
 * overflow it scrolls continuously (the list is doubled so the loop is
 * seamless); with only a few it sits still and centred.
 */
export default function ParticipantBanner({ participants = PARTICIPANTS }: { participants?: Participant[] }) {
  if (participants.length === 0) return null;
  const scroll = participants.length >= 5;
  const items = scroll ? [...participants, ...participants] : participants;
  const Logo = ({ p }: { p: Participant }) => {
    // eslint-disable-next-line @next/next/no-img-element
    const img = <img src={p.logo} alt={p.name} title={p.name} className="max-h-16 sm:max-h-20 w-auto max-w-[260px] object-contain opacity-95 hover:opacity-100 transition-opacity" />;
    return <Link href={`/${p.slug}`} className="shrink-0">{img}</Link>;
  };
  return (
    <div className="mt-12">
      <p className="text-gold-soft font-display tracking-[0.25em] uppercase text-xs mb-4">Participating shuls</p>
      <div className="relative overflow-hidden">
        {scroll && (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-navy to-transparent z-10" />
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-navy to-transparent z-10" />
          </>
        )}
        <div className={scroll ? "flex min-w-max items-center gap-10 marquee" : "flex flex-wrap items-center gap-10"}>
          {items.map((p, i) => <Logo key={`${p.slug}-${i}`} p={p} />)}
        </div>
      </div>
    </div>
  );
}
