import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { LogoOnDark } from "@/components/Logo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://shabboswithadas.com"),
  title: "The Elul Shabbos Project | Adas Torah",
  description:
    "One small thing for Shabbos, every week of Elul. Join the Adas Torah community campaign.",
  openGraph: {
    title: "The Elul Shabbos Project",
    description:
      "One small thing for Shabbos, every week of Elul. Men, women & kids — sign up, get a weekly reminder, and watch the whole shul's numbers grow.",
    url: "https://shabboswithadas.com",
    siteName: "The Elul Shabbos Project",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = (await cookies()).get("elul_token")?.value;
  const familyHref = token ? `/c/${encodeURIComponent(token)}` : "/find";

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="bg-navy text-cream">
          <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <span className="font-display text-xl tracking-wide truncate">
                The Elul Shabbos Project
              </span>
            </Link>
            <div className="flex items-center gap-4 shrink-0">
              <Link
                href={familyHref}
                className="text-sm text-gold-soft hover:text-gold underline underline-offset-4 whitespace-nowrap"
              >
                {token ? "My family" : "Sign in"}
              </Link>
              <Link href="/" className="shrink-0">
                <LogoOnDark className="h-9 w-auto" />
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-navy-deep text-cream/70 text-sm">
          <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col items-center gap-4">
            <LogoOnDark className="h-12 w-auto" />
            <span className="font-display text-center">
              Adas Torah &middot; 9040 W. Pico Blvd, Los Angeles
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
