import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { BrandMark } from "@/components/Logo";
import { getShul, shulBaseUrl } from "@/lib/tenant";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const shul = await getShul();
  return {
    metadataBase: new URL(shulBaseUrl(shul)),
    title: `${shul.campaignName} | ${shul.name}`,
    description: `One small thing for Shabbos, every week of Elul. Join the ${shul.name} community campaign.`,
    openGraph: {
      title: shul.campaignName,
      description:
        "One small thing for Shabbos, every week of Elul. Men, women & children — sign up, get a weekly reminder, and watch the whole shul's numbers grow.",
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
  const shul = await getShul();
  const token = (await cookies()).get("elul_token")?.value;
  const familyHref = token ? `/c/${encodeURIComponent(token)}` : "/find";

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
            </span>
            <Link href="/find" className="underline underline-offset-2 hover:text-gold-soft">
              Sign in to my family page
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
