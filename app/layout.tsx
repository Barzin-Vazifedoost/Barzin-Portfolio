import type { Metadata } from "next";
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/site-nav";
import SiteYear from "@/components/site-year";
import TreeBackdrop from "@/components/tree-backdrop";
import { getTreeContent } from "@/lib/content/tree";
import { site } from "@/lib/site";

/**
 * Three families load on first paint, so each one asks for only what it uses.
 *
 * Fraunces carries `wght`, `SOFT`, `WONK` and an optical-size axis; the design
 * uses weight and optical sizing and nothing else, so `axes` drops the other
 * two rather than shipping them. Weight ranges are narrowed for the same
 * reason — a variable font still carries every master it was built with.
 */

/** Display voice: a variable serif with optical sizing — organic, not a UI grotesk. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  // No `weight` here on purpose: `axes` is only accepted alongside a variable
  // weight, and weight is the one axis this design does vary. Naming `opsz`
  // keeps optical sizing and drops SOFT and WONK.
  axes: ["opsz"],
});

/** The engineer voice: eyebrows, dates, counts. Uppercase, one weight. */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

/** Body copy stays deliberately quiet. */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: site.name,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
  },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${site.url}/feed.xml` },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read once, here, so the tree outlives every route beneath it.
  const { entries, seed, density } = await getTreeContent();

  return (
    <html
      lang={site.locale}
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      {/*
        Extensions such as Grammarly stamp attributes onto <body> before React
        hydrates (`data-gr-ext-installed`, `data-new-gr-c-s-check-loaded`),
        which React reports as a hydration mismatch. This suppresses the warning
        for this element's own attributes only — one level deep, never its
        children — so a genuine mismatch inside the page still surfaces.
      */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {/*
          The one tree. Mounted above the route slot, so navigating moves the
          camera instead of tearing the canvas down and regrowing it.
        */}
        <TreeBackdrop seed={seed} density={density} entries={entries} />

        <a
          href="#main"
          className="eyebrow sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-[var(--bg-raised)] focus:px-3 focus:py-2 focus:text-[var(--core)]"
        >
          Skip to content
        </a>

        <header className="relative z-20 px-6 pt-6 sm:px-10">
          <SiteNav />
        </header>

        <main id="main" className="relative z-10 flex-1">
          {children}
        </main>

        <footer className="relative z-20 mt-24 px-6 pb-10 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-[var(--deep)] pt-6">
            <p className="meta">
              © <SiteYear /> {site.name}
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="eyebrow transition-colors duration-300 hover:text-[var(--neon)]"
                >
                  Email
                </a>
              </li>
              {site.socials.map((social) => (
                <li key={social.href}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eyebrow transition-colors duration-300 hover:text-[var(--neon)]"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/feed.xml"
                  className="eyebrow transition-colors duration-300 hover:text-[var(--neon)]"
                >
                  RSS
                </a>
              </li>
            </ul>
          </div>
        </footer>
      </body>
    </html>
  );
}
