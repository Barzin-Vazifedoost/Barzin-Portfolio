import type { Metadata } from "next";
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";

/** Display voice: a variable serif with optical sizing — organic, not a UI grotesk. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

/** The engineer voice: eyebrows, dates, counts. */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

/** Body copy stays deliberately quiet. */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={site.locale}
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/*
          Reveal animations render their hidden state into the prerendered HTML,
          so without JS anything waiting on an observer would stay invisible.
          This puts it all back, for every page at once.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>

        <a
          href="#main"
          className="eyebrow sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-[var(--bg-raised)] focus:px-3 focus:py-2 focus:text-[var(--core)]"
        >
          Skip to content
        </a>

        <SiteHeader name={site.name} nav={site.nav} />

        <main id="main" className="relative z-10 flex-1">
          {children}
        </main>

        <footer className="relative z-20 mt-32 px-6 pb-10 sm:px-10">
          <div className="mx-auto max-w-6xl">
            {/* A hairline that fades out to both sides rather than butting into
                the page edges — the same motif as the section rules. */}
            <div
              aria-hidden="true"
              className="h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent"
            />

            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4 pt-6">
              <p className="meta">
                © {new Date().getFullYear()} {site.name}
              </p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                <li>
                  <a
                    href={`mailto:${site.email}`}
                    className="eyebrow underline-draw text-[var(--text-faint)] transition-colors duration-400 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
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
                      className="eyebrow underline-draw text-[var(--text-faint)] transition-colors duration-400 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="/feed.xml"
                    className="eyebrow underline-draw text-[var(--text-faint)] transition-colors duration-400 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
                  >
                    RSS
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
