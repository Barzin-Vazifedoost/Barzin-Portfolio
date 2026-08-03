"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

/**
 * Reveals its children once they scroll into view, then stops observing.
 *
 * Deliberately not built on `motion`: the inner pages have no other animation,
 * and pulling the animation library into their bundles to fade a heading in
 * would cost more than the effect. An IntersectionObserver plus a CSS
 * transition is a few lines and ships nothing.
 *
 * There is no React state here. The observer flips a data attribute on the node
 * and `.reveal` in `globals.css` does the rest, so a reveal never re-renders
 * the subtree it wraps. That stylesheet also owns the reduced-motion case: the
 * hidden state only exists inside a `prefers-reduced-motion: no-preference`
 * query, so with motion reduced the content is simply visible and this
 * component's only job is to observe something that is already shown.
 *
 * The prerendered HTML carries the hidden state, so `[data-reveal]` is put back
 * by the `<noscript>` rule in the root layout for clients without JS.
 */
export function Reveal({
  as: Tag = "div",
  children,
  /** Seconds of delay, for staggering siblings. */
  delay = 0,
  className = "",
}: {
  /** Element to render. Use `li` inside a list, so the markup stays valid. */
  as?: "div" | "li" | "section";
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        element.dataset.shown = "true";
        observer.disconnect();
      },
      // Fires a little before the element reaches the viewport edge, so the
      // transition is already under way by the time it is properly in frame.
      { rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // One shared ref across the allowed tags; the union keeps callers honest
      // without making the component generic.
      ref={ref as never}
      data-reveal
      className={`reveal ${className}`}
      style={delay > 0 ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
