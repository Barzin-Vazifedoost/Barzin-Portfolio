import type { ReactNode } from "react";

/**
 * Shared frame for every page that isn't the home scene. It carries the same
 * eyebrow → display title → lead structure.
 *
 * It used to paint a static CSS aura as a stand-in for the home page's canvas.
 * That is gone: the real tree now lives in the root layout and is behind this
 * page too, so a second, fake glow would only fight it.
 *
 * Server component: no state, no effects, nothing to hydrate.
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
  /**
   * Which half of the tree this page belongs to. `roots` swaps the palette
   * tokens for the underground register — every component below reads them, so
   * nothing else has to know.
   */
  register?: "canopy" | "roots";
  children: ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  lead,
  aside,
  width = "wide",
  register = "canopy",
  children,
}: PageShellProps) {
  return (
    <div className={`relative ${register === "roots" ? "register-roots" : ""}`}>
      <div
        className={`mx-auto px-6 pb-24 pt-16 sm:px-10 ${
          width === "prose" ? "max-w-[68ch]" : "max-w-5xl"
        }`}
      >
        <header className="mb-16 border-b border-[var(--deep)]/60 pb-10">
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              aria-hidden="true"
              className="block h-1.5 w-1.5 rounded-full bg-[var(--neon)] shadow-[0_0_12px_var(--neon)]"
            />
            <span className="eyebrow">{eyebrow}</span>
            {aside ? <span className="meta ml-auto">{aside}</span> : null}
          </div>

          <h1 className="display text-[length:var(--step-hero)] leading-[0.95]">{title}</h1>

          {lead ? (
            <p className="mt-6 max-w-[52ch] text-[var(--text-dim)]">{lead}</p>
          ) : null}
        </header>

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
  const className =
    "eyebrow group/link relative inline-block text-[var(--label)] transition-colors duration-500 ease-[var(--ease-flow)] hover:text-[var(--neon)]";

  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
      />
    </a>
  );
}
