/**
 * Shared channel between the page and the canvas. It lives here rather than in
 * `growth-tree.tsx` so callers can dispatch without statically importing the
 * canvas module — which would pull it back into the main bundle and undo the
 * dynamic `ssr: false` split.
 */
export const TREE_SURGE_EVENT = "growth-tree:surge";
export const TREE_ILLUMINATE_EVENT = "growth-tree:illuminate";

/** Sends a burst of pulses up the tree. Safe to call before the canvas mounts. */
export function surgeTree(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TREE_SURGE_EVENT));
}

export type IlluminateDetail = { slug: string | null };

/**
 * Lights the path from the root to `slug`, so hovering a link anywhere on the
 * site shows you where you are about to go before you go there. `null` clears
 * it and hands the canopy back to whatever the route was already lighting.
 */
export function illuminateTree(slug: string | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<IlluminateDetail>(TREE_ILLUMINATE_EVENT, { detail: { slug } }),
  );
}
