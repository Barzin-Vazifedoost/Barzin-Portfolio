"use client";

import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";

/**
 * Wraps a panel so a soft highlight follows the pointer across it. The
 * gradient itself is `.spotlight` in `globals.css`; all this does is publish
 * the cursor position as two custom properties.
 *
 * Writing straight to the node's style rather than through state is deliberate:
 * pointermove fires at frame rate, and re-rendering the card's whole subtree
 * that often would cost far more than the effect is worth. Children are passed
 * through untouched, so a Server Component can render the card's contents and
 * only this shell is client-side.
 */
export function Spotlight({
  as: Tag = "div",
  className = "",
  children,
}: {
  /** Element to render. Use `li` when the card is a list row. */
  as?: "div" | "li" | "article";
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);

  const track = (event: PointerEvent<HTMLElement>): void => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    element.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  return (
    <Tag
      // One shared ref across the three allowed tags; the union keeps the
      // callers honest without needing a generic component.
      ref={ref as never}
      onPointerMove={track}
      className={`spotlight ${className}`}
    >
      {children}
    </Tag>
  );
}
