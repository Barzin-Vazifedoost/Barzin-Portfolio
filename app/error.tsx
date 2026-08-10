"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary. Without one, an unhandled render error drops the
 * visitor onto Next's own fallback — an unstyled page with none of this site on
 * it. This keeps them inside the shell, so the header, the footer and the tree
 * behind them all survive the failure.
 *
 * On-concept with the 404's "Nothing grew here": a branch that failed rather
 * than a page that is missing.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack, which is not sent
    // to the browser. Logging it is what makes a production report actionable.
    console.error("Route error", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24 sm:px-10">
      <p className="eyebrow">Error</p>
      <h1 className="display mt-6 text-[var(--step-hero)] leading-[0.95] text-[var(--core)]">
        This branch broke.
      </h1>
      <p className="mt-6 max-w-[52ch] text-[var(--text-dim)]">
        Something failed while this page was growing. The rest of the tree is
        fine — try again, or climb back down.
      </p>

      {error.digest ? (
        <p className="meta mt-4">
          Reference <span className="text-[var(--text-dim)]">{error.digest}</span>
        </p>
      ) : null}

      <div className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <button
          type="button"
          onClick={reset}
          className="eyebrow group/link relative inline-block text-[var(--core)]"
        >
          Try again ↻
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
          />
        </button>
        <Link
          href="/"
          className="eyebrow group/link relative inline-block text-[var(--label)]"
        >
          ← Back to the root
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
          />
        </Link>
      </div>
    </div>
  );
}
