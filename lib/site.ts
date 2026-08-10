/**
 * Single source of truth for site-wide identity, navigation and social links.
 * Values marked TODO are placeholders — fill them in before deploying.
 */

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export type NavItem = {
  href: string;
  label: string;
};

export type SocialLink = {
  label: string;
  href: string;
};

export const site = {
  name: "Barzin Vazifedoost",
  /** Used as the default <title> and the suffix on every other page. */
  title: "Barzin Vazifedoost",
  /** TODO: one line on what you do. */
  tagline: "Software engineer.",
  /** TODO: 1–2 sentences. Used for SEO descriptions and social cards. */
  description:
    "Portfolio, project case studies and writing by Barzin Vazifedoost.",
  locale: "en",
  url: siteUrl,
  email: "barzin.vazifedoost@gmail.com",
  socials: [
    { label: "GitHub", href: "https://github.com/Barzin-Vazifedoost" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/TODO" },
  ] satisfies SocialLink[],
  nav: [
    { href: "/projects", label: "Projects" },
    { href: "/blog", label: "Writing" },
    { href: "/tree", label: "Tree" },
    { href: "/resume", label: "Resume" },
  ] satisfies NavItem[],
};

/** Turns a root-relative path into an absolute URL (for feeds, sitemaps, OG tags). */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, `${site.url}/`).toString();
}
