/**
 * v2 brand marks: each shul stores logo paths/URLs on its Shul row; pages
 * pass them in. With no image set, a clean text wordmark renders instead.
 */
export function BrandMark({
  src,
  label,
  tone,
  className = "h-10 w-auto",
}: {
  src: string | null | undefined;
  label: string;
  tone: "dark" | "light"; // background the mark sits on
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={label} className={className} />;
  }
  return (
    <span
      className={
        "font-display tracking-[0.18em] uppercase text-sm text-center " +
        (tone === "dark" ? "text-gold-soft" : "text-navy")
      }
    >
      {label}
    </span>
  );
}
