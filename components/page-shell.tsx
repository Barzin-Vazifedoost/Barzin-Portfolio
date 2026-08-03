import type { ReactNode } from "react";
import Link from "next/link";

import { Reveal } from "@/components/reveal";

/**
 * Shared frame for every page that isn't the home scene. It carries the same
 * eyebrow → display title → lead structure and a static CSS aura, so inner
 * pages read as the same system without paying for a second canvas.
 *
 * Server component: no state, no effects. The only client code it pulls in is
 * the reveal wrapper around its own header.
 */
export type PageShellProps = {
  /** Mono label above the title. */
  eyebrow: string;
  title: string;
  /** Optional sentence under the title. */
  lead?: string;
  /** Optional mono metadata row, rendered right of the eyebrow. */
  aside?: ReactNode;
  /** Wider measure for index pages; prose width for reading. */
  width?: "prose" | "wide";
  children: ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  lead,
  aside,
  width = "wide",
  children,
}: PageShellProps) {
  return (
    <div className="relative">
      {/*
        Static counterpart to the home page's ground glow: one wash from the
        top-left and a second, cooler one from the far edge, so the page is not
        lit from a single point. Both are fixed, so they behave like a room the
        content scrolls through rather than a texture stuck to it.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: [
            "radial-gradient(110% 70% at 8% -6%, rgba(63,242,160,0.13) 0%, rgba(10,59,36,0.06) 40%, rgba(4,8,6,0) 72%)",
            "radial-gradient(80% 55% at 100% 8%, rgba(43,164,106,0.08) 0%, rgba(4,8,6,0) 62%)",
          ].join(", "),
        }}
      />

      <div
        className={`mx-auto px-6 pb-28 pt-14 sm:px-10 ${
          width === "prose" ? "max-w-[70ch]" : "max-w-6xl"
        }`}
      >
        <Reveal>
          <header className="mb-14">
            <div className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span aria-hidden="true" className="node node-lit" />
              <span className="eyebrow">{eyebrow}</span>
              {aside ? <span className="meta ml-auto">{aside}</span> : null}
            </div>

            <h1 className="display display-wash text-[length:var(--step-hero)] leading-[0.95]">
              {title}
            </h1>

            {lead ? (
              <p className="lead mt-7 max-w-[54ch] text-[var(--text-dim)]">{lead}</p>
            ) : null}

            {/* Rule under the header, fading out to the right so it reads as a
                horizon rather than a box edge. */}
            <div
              aria-hidden="true"
              className="mt-10 h-px bg-gradient-to-r from-[var(--border-strong)] via-[var(--border)] to-transparent"
            />
          </header>
        </Reveal>

        {children}
      </div>
    </div>
  );
}

/** Quiet mono link with an underline that draws itself on hover. */
export function QuietLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      className="eyebrow underline-draw inline-block text-[var(--mid)] transition-colors duration-400 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/**
 * Footer navigation for a detail page: a rule, then a back link whose arrow
 * slides on hover. Every detail page had its own copy of this markup.
 */
export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <footer className="mt-20">
      <div
        aria-hidden="true"
        className="mb-8 h-px bg-gradient-to-r from-[var(--border)] to-transparent"
      />
      <Link
        href={href}
        className="eyebrow underline-draw group/back inline-flex items-center gap-2 text-[var(--mid)] transition-colors duration-400 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
      >
        <span
          aria-hidden="true"
          className="transition-transform duration-400 ease-[var(--ease-flow)] group-hover/back:-translate-x-1"
        >
          ←
        </span>
        {children}
      </Link>
    </footer>
  );
}

/**
 * Section label: a lit node, the mono label, and a rule running out to the
 * right. Used by the resume and any page that divides a long column.
 */
export function SectionHead({ children }: { children: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <span aria-hidden="true" className="node node-lit" />
      <h2 className="eyebrow">{children}</h2>
      <span
        aria-hidden="true"
        className="ml-2 block h-px flex-1 bg-gradient-to-r from-[var(--border-strong)] to-transparent"
      />
    </div>
  );
}
