/**
 * Shared channel between the home scene and the canvas. It lives here rather
 * than in `growth-tree.tsx` so the scene can dispatch without statically
 * importing the canvas module — which would pull it back into the main bundle
 * and undo the dynamic `ssr: false` split.
 */
export const TREE_SURGE_EVENT = "growth-tree:surge";

/** Sends a burst of pulses up the tree. Safe to call before the canvas mounts. */
export function surgeTree(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TREE_SURGE_EVENT));
}
