/**
 * The five structural greens, as data.
 *
 * These mirror the tokens in `app/globals.css`. The canvas cannot read a CSS
 * variable without a `getComputedStyle` call on every frame, so it needs its
 * own copy — but that copy does not belong inside the renderer. It lived in
 * `components/growth-tree.tsx`, which is a `"use client"` module, so anything
 * rendered on the server that wanted the palette (the social card, the favicon)
 * imported a client reference instead of these strings and got `undefined`.
 *
 * Keep in sync with the `:root` block in `app/globals.css`. Text colours are
 * deliberately not here: those are `--label` and the `--text-*` ramp, they are
 * answerable to contrast rather than to the drawing, and nothing off-screen
 * needs them.
 */

export type GrowthTreePalette = {
  bg: string;
  /** Emerald — roots. */
  deep: string;
  /** Mid canopy. */
  mid: string;
  /** Growing edge, pulses, glow. */
  neon: string;
  /** Mint — tips and node cores. */
  core: string;
};

export const GROWTH_TREE_PALETTE: GrowthTreePalette = {
  bg: "#050805",
  deep: "#0a3d1a",
  mid: "#1a7a3a",
  neon: "#39ff14",
  core: "#c8ffdb",
};
