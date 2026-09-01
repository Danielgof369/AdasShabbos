import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { BrandMark } from "@/components/Logo";
import { currentShul, shulBaseUrl, rootBaseUrl } from "@/lib/tenant";
import { PLATFORM } from "@/lib/platform";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const shul = await currentShul();
  if (!shul) {
    return {
      metadataBase: new URL(rootBaseUrl()),
      title: `${PLATFORM.name} — ${PLATFORM.tagline}`,
      description:
        "A national network of shul Shabbos campaigns. Every man, woman and child takes on one small thing for Shabbos, every week — with reminders, check-ins and a live count for the whole community. Free for any shul.",
      openGraph: {
        title: PLATFORM.name,
        description: PLATFORM.tagline,
        url: rootBaseUrl(),
        siteName: PLATFORM.name,
      },
    };
  }
  return {
    metadataBase: new URL(shulBaseUrl(shul)),
    title: `${shul.campaignName} | ${shul.name}`,
    description: `One small thing for Shabbos, every week. Join the ${shul.name} community campaign.`,
    openGraph: {
      title: `${shul.campaignName} — ${shul.name}`,
      description:
        "One small thing for Shabbos, every week. Men, women & children — sign up, get a weekly reminder, and watch the whole shul's numbers grow.",
      url: shulBaseUrl(shul),
      siteName: shul.campaignName,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shul = await currentShul();

  if (!shul) {
    return (
      <html lang="en" className="h-full antialiased">
        <body className="min-h-full flex flex-col">
          <header className="bg-navy text-cream">
            <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ksi-mark-white.png" alt="" className="h-10 w-auto shrink-0" />
                <span className="font-display text-lg sm:text-xl tracking-wide truncate">{PLATFORM.name}</span>
              </Link>
              <nav className="flex items-center gap-4 sm:gap-6 text-sm shrink-0">
                <Link href="/shuls" className="hidden sm:block text-cream/85 hover:text-gold-soft whitespace-nowrap">
                  Find your shul
                </Link>
                <Link
                  href="/start"
                  className="bg-gold text-navy-deep font-semibold rounded-lg px-4 py-2 hover:bg-gold-soft transition-colors whitespace-nowrap"
                >
                  <span className="sm:hidden">Start</span>
                  <span className="hidden sm:inline">Bring it to your shul</span>
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="bg-navy-deep text-cream/70 text-sm">
            <div className="mx-auto max-w-5xl px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ksi-logo-white.png" alt={PLATFORM.name} className="h-20 w-auto" />
                <div className="hidden sm:block text-cream/70 max-w-xs">{PLATFORM.tagline}</div>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/shuls" className="underline underline-offset-2 hover:text-gold-soft">Shuls</Link>
                <Link href="/start" className="underline underline-offset-2 hover:text-gold-soft">Start a campaign</Link>
                <a href={`mailto:${PLATFORM.contactEmail}`} className="underline underline-offset-2 hover:text-gold-soft">Contact</a>
              </div>
            </div>
          </footer>
        </body>
      </html>
    );
  }

  const token = (await cookies()).get("elul_token")?.value;
  const familyHref = token ? `/c/${encodeURIComponent(token)}` : "/find";
  const resourceCount = await prisma.resource.count({ where: { shulId: shul.id } });

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="bg-navy text-cream">
          <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <span className="font-display text-xl tracking-wide truncate">
                {shul.campaignName}
              </span>
            </Link>
            <div className="flex items-center gap-4 shrink-0">
              {resourceCount > 0 && (
                <Link
                  href="/resources"
                  className="hidden sm:block text-sm text-gold-soft hover:text-gold underline underline-offset-4 whitespace-nowrap"
                >
                  Resources
                </Link>
              )}
              <Link
                href={familyHref}
                className="text-sm text-gold-soft hover:text-gold underline underline-offset-4 whitespace-nowrap"
              >
                {token ? "My family" : "Sign in"}
              </Link>
              <Link href="/" className="shrink-0 flex items-center gap-3">
                <BrandMark src={shul.logoDark} label={shul.name} tone="dark" className="h-9 w-auto" />
                {shul.partnerName && (
                  <>
                    <span className="hidden sm:block h-8 w-px bg-cream/25" aria-hidden />
                    <span className="hidden sm:block">
                      <BrandMark
                        src={shul.partnerLogoDark}
                        label={shul.partnerName}
                        tone="dark"
                        className="h-8 w-auto"
                      />
                    </span>
                  </>
                )}
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-navy-deep text-cream/70 text-sm">
          <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-5">
              <BrandMark src={shul.logoDark} label={shul.name} tone="dark" className="h-12 w-auto" />
              {shul.partnerName && (
                <>
                  <span className="h-10 w-px bg-cream/25" aria-hidden />
                  <BrandMark
                    src={shul.partnerLogoDark}
                    label={shul.partnerName}
                    tone="dark"
                    className="h-10 w-auto"
                  />
                </>
              )}
            </div>
            <span className="font-display text-center">
              {shul.name}
              {shul.partnerName ? ` & ${shul.partnerName}` : ""} &middot; {shul.city}
              {shul.state ? `, ${shul.state}` : ""}
            </span>
            <div className="flex items-center gap-4">
              {resourceCount > 0 && (
                <Link href="/resources" className="underline underline-offset-2 hover:text-gold-soft">
                  Resources
                </Link>
              )}
              <Link href="/find" className="underline underline-offset-2 hover:text-gold-soft">
                Sign in to my family page
              </Link>
            </div>
            <a
              href={rootBaseUrl()}
              className="text-xs text-cream/45 hover:text-gold-soft mt-2"
            >
              Powered by {PLATFORM.name} &middot; bring it to your shul
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
