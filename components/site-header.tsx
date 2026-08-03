"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import type { NavItem } from "@/lib/site";

/**
 * The sticky header. Transparent over the hero so the canvas reads uncovered,
 * then frosting into a glass bar with a hairline once the page moves — the
 * cheapest way to signal "you have scrolled" without a second element.
 *
 * Client component for two reasons: the scroll state, and
 * `useSelectedLayoutSegment` for the active route. Rendered from the root
 * layout, that hook returns the top-level segment (`projects`, `blog`,
 * `resume`) or `null` on the home page, which is exactly the granularity the
 * nav needs — `/blog/some-post` still lights "Writing".
 */

/** Scroll distance, in pixels, before the bar frosts over. */
const FROST_AT = 24;

/** "Barzin Vazifedoost" → "BV". The phone-width stand-in for the wordmark. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** A sprig: three strokes echoing the canvas tree, at nav scale. */
function Sprig() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className="h-4 w-4 shrink-0"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    >
      <path d="M8 15V6" />
      <path d="M8 9.5 4 6.2" />
      <path d="M8 8 12 4.4" />
      <circle cx="8" cy="4.6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="3.6" cy="5.7" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="12.4" cy="3.9" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}

export type SiteHeaderProps = {
  name: string;
  nav: NavItem[];
};

export function SiteHeader({ name, nav }: SiteHeaderProps) {
  const segment = useSelectedLayoutSegment();
  const [frosted, setFrosted] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // The scroll range is cached and refreshed from an observer. Reading
    // `scrollHeight` inside the scroll handler would force a synchronous
    // reflow on every event, which is the one thing never to do there.
    let range = 0;
    const measure = (): void => {
      range = document.documentElement.scrollHeight - window.innerHeight;
    };

    const read = (): void => {
      // The bar is driven by writing the transform straight to the node. Going
      // through state would re-render the whole nav on every scroll frame.
      const bar = progressRef.current;
      if (bar) {
        const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
        bar.style.transform = `scaleX(${progress})`;
      }

      // State only ever changes on a threshold crossing.
      setFrosted((current) => {
        const next = window.scrollY > FROST_AT;
        return next === current ? current : next;
      });
    };

    measure();
    read();

    const observer = new ResizeObserver(() => {
      measure();
      read();
    });
    observer.observe(document.body);

    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* Reading progress. Sits on the header's top edge on every page. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-px overflow-hidden"
      >
        <div
          ref={progressRef}
          className="h-full w-full origin-left scale-x-0 bg-gradient-to-r from-[var(--mid)] via-[var(--neon)] to-[var(--core)]"
          style={{ willChange: "transform" }}
        />
      </div>

      <div
        className="border-b transition-all duration-500 ease-[var(--ease-flow)]"
        style={{
          height: "var(--nav-h)",
          borderColor: frosted ? "var(--border)" : "transparent",
          backgroundColor: frosted ? "rgb(4 8 6 / 0.72)" : "transparent",
          backdropFilter: frosted ? "blur(14px) saturate(140%)" : "none",
          WebkitBackdropFilter: frosted ? "blur(14px) saturate(140%)" : "none",
        }}
      >
        <nav
          aria-label="Main"
          className="mx-auto flex h-full max-w-6xl items-center gap-x-3 px-6 sm:gap-x-6 sm:px-10"
        >
          <Link
            href="/"
            className="group/home flex items-center gap-2.5 text-[var(--text-dim)] transition-colors duration-400 ease-[var(--ease-flow)] hover:text-[var(--core)]"
          >
            <span className="text-[var(--mid)] transition-colors duration-400 ease-[var(--ease-flow)] group-hover/home:text-[var(--neon)]">
              <Sprig />
            </span>
            {/* The full name needs more room than a phone has once the three
                nav links are laid out, so it shortens to initials there. */}
            <span className="eyebrow hidden text-inherit sm:inline">{name}</span>
            <span className="eyebrow text-inherit sm:hidden">{initials(name)}</span>
          </Link>

          <ul className="ml-auto flex items-center gap-x-0.5 sm:gap-x-2">
            {nav.map((item) => {
              // `/projects` → `projects`, which is what the hook returns.
              const active = segment === item.href.replace(/^\//, "");

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`eyebrow relative block rounded-full px-1.5 py-2 tracking-[0.13em] transition-colors duration-400 ease-[var(--ease-flow)] sm:px-3 sm:tracking-[0.22em] ${
                      active
                        ? "text-[var(--core)]"
                        : "text-[var(--text-faint)] hover:text-[var(--neon)]"
                    }`}
                  >
                    {/* Active pill sits behind the label, not around it, so the
                        text never shifts when the route changes. */}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full border border-[var(--border-strong)] bg-[var(--surface-hover)]"
                      />
                    ) : null}
                    <span className="relative">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
