import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@/components/analytics/Analytics";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { SITE, SITE_URL, absoluteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — Finish any document task, fast`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "compress pdf",
    "resize image to kb",
    "merge pdf",
    "split pdf",
    "jpg to pdf",
    "signature background remover",
    "exam photo resize",
    "SSC UPSC NEET photo signature",
    "pdf editor online",
    "convert pdf",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE_URL,
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
};

/** Site-wide structured data so search engines understand the app. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any (web browser)",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: SITE.description,
  image: absoluteUrl("/opengraph-image"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <header className="border-b border-edge">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <span className="w-7 h-7 rounded-lg bg-accent/90 grid place-items-center text-white font-bold text-sm group-hover:bg-accent transition-colors">
                D
              </span>
              <span className="font-semibold text-bright tracking-tight">
                {SITE.name}
              </span>
            </Link>
            <nav className="flex items-center gap-4 sm:gap-5 text-sm">
              <Link href="/" className="hover:text-bright transition-colors">
                Workspace
              </Link>
              <Link href="/write" className="hover:text-bright transition-colors">
                Write
              </Link>
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted border border-edge rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-good inline-block" />
                Files never leave your device
              </span>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>
        <InstallPrompt />

        <footer className="border-t border-edge">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-between">
              <span>
                {SITE.name} — every tool runs locally in your browser. No uploads,
                no accounts, no limits.
              </span>
              <span>
                Exam specs change between notifications — always verify against the
                latest official notification.
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 items-center border-t border-edge pt-3">
              <Link href="/" className="hover:text-bright transition-colors">
                Workspace
              </Link>
              <Link href="/write" className="hover:text-bright transition-colors">
                Write
              </Link>
              <Link href="/privacy" className="hover:text-bright transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-bright transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
