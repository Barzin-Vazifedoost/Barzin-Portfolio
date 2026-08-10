"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * Last resort: an error thrown by the root layout itself, which `error.tsx`
 * cannot catch because it renders *inside* that layout.
 *
 * This replaces the whole document, so it has to supply its own `<html>` and
 * `<body>`, and it cannot assume anything the layout sets up — the fonts are
 * not loaded here, so it asks for the stacks directly rather than the
 * `--font-*` variables. Colours still come from `globals.css`, which is
 * imported above and does not depend on the layout having run.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "var(--bg)",
          color: "var(--text)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          padding: "2rem 1.5rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: "40rem", margin: "0 auto" }}>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.75rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--label)",
            }}
          >
            Error
          </p>
          <h1
            style={{
              fontFamily: "ui-serif, Georgia, serif",
              fontSize: "clamp(2.5rem, 8vw, 5rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: "var(--core)",
              marginTop: "1.5rem",
            }}
          >
            The tree fell.
          </h1>
          <p
            style={{
              marginTop: "1.5rem",
              lineHeight: 1.7,
              color: "var(--text-dim)",
            }}
          >
            Something failed before the page could be built. Reloading usually
            fixes it.
          </p>

          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                letterSpacing: "0.08em",
                color: "var(--text-faint)",
                marginTop: "1rem",
              }}
            >
              Reference {error.digest}
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2.5rem",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.75rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--core)",
              background: "none",
              border: "1px solid var(--deep)",
              borderRadius: "2px",
              padding: "0.75rem 1.25rem",
              cursor: "pointer",
            }}
          >
            Reload ↻
          </button>
        </main>
      </body>
    </html>
  );
}
