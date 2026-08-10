"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { site } from "@/lib/site";

/**
 * The header nav, with the current route marked.
 *
 * The site had no active-page indicator at all — no visual signal and no
 * `aria-current` anywhere in the markup. The marker is the same node the
 * canopy uses for a branch carrying content, and the same one that opens every
 * section heading: where you are is a lit node, here as everywhere else.
 *
 * A client component only because it needs `usePathname`. The rest of the
 * layout stays a server component.
 */
export default function SiteNav() {
  const pathname = usePathname();

  /**
   * A section is current when you are on its index or anywhere beneath it, so
   * reading a post keeps "Writing" lit. `/` would prefix-match everything, so
   * it is compared exactly.
   */
  const isCurrent = (href: string): boolean =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Main" className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <Link
        href="/"
        aria-current={isCurrent("/") ? "page" : undefined}
        className="eyebrow text-[var(--text-dim)] transition-colors duration-300 hover:text-[var(--neon)]"
      >
        {site.name}
      </Link>
      <ul className="flex gap-x-5">
        {site.nav.map((item) => {
          const current = isCurrent(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`eyebrow relative inline-flex items-center gap-2 transition-colors duration-300 hover:text-[var(--neon)] ${
                  current ? "text-[var(--core)]" : ""
                }`}
              >
                {/*
                  Occupies its slot whether lit or not, so the row does not
                  reflow as you navigate between sections.
                */}
                <span
                  aria-hidden="true"
                  className={`block h-1 w-1 rounded-full transition-all duration-500 ease-[var(--ease-flow)] ${
                    current
                      ? "bg-[var(--neon)] shadow-[0_0_10px_var(--neon)]"
                      : "bg-[var(--deep)]"
                  }`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
