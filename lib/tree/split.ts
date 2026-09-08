/**
 * The tree coming apart as you scroll.
 *
 * At the top of the page it is a plant: joints closed, canopy whole. As you
 * descend, every joint opens and the two subtrees drift away from the trunk —
 * writing to the left, work to the right — until what is left reads as the
 * binary structure it always was. Organic silhouette at the top, node-link
 * diagram at the bottom. The site's whole argument, made kinetic.
 *
 * Each branch is displaced rigidly by its own vector, so a joint's gap is the
 * difference between a child's displacement and its parent's. Displacement
 * accumulates down the chain, which is what keeps the thing coherent while it
 * separates: a limb drifts with everything hanging off it rather than tearing.
 *
 * Driven by `restAngle`, never the wind-perturbed angle, so separation is a
 * structural transform and does not jitter in the breeze.
 */

import { clamp } from "./math";
import type { TreeTopology } from "./build";

export const SPLIT = {
  /** Scroll fraction where the tree starts to come apart. Below this it is
   *  whole, so the hero is never a diagram. */
  start: 0.06,
  /** Scroll fraction where separation is complete. */
  end: 0.88,
  /** Gap opened at every joint at full separation, in pixels. Accumulates with
   *  depth, so tips travel `depth × gap`. */
  jointGap: 9,
  /** Total lateral drift of the outermost canopy, per side, at full separation.
   *  This is the binary split made literal. */
  lateral: 130,
  /** Extra lift applied to the deepest layers, so the canopy opens upward as it
   *  separates instead of only sliding sideways. */
  lift: 46,
} as const;

/** Per-branch displacement. Flat arrays: this is rewritten every frame. */
export type Separation = {
  x: Float64Array;
  y: Float64Array;
  /** Eased 0 → 1. The renderer uses it to straighten curves and fade joints. */
  progress: number;
};

export function createSeparation(count: number): Separation {
  return { x: new Float64Array(count), y: new Float64Array(count), progress: 0 };
}

/** Smoothstep, so the tree eases apart rather than starting with a jolt. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Resolves displacement for every branch. `out` must be sized for the topology;
 * it is written in place so the render loop allocates nothing.
 */
export function solveSeparation(
  topology: TreeTopology,
  scrollProgress: number,
  out: Separation,
): void {
  const { branches, maxDepth } = topology;
  const raw = clamp(
    (scrollProgress - SPLIT.start) / Math.max(0.0001, SPLIT.end - SPLIT.start),
    0,
    1,
  );
  const t = ease(raw);
  out.progress = t;

  if (t === 0) {
    out.x.fill(0);
    out.y.fill(0);
    return;
  }

  const gap = SPLIT.jointGap * t;
  // Divided by depth so the accumulated total across the deepest chain is
  // `lateral`, rather than growing without bound as the tree gets deeper.
  const lateralStep = (SPLIT.lateral * t) / Math.max(1, maxDepth);
  const liftStep = (SPLIT.lift * t) / Math.max(1, maxDepth);

  for (const branch of branches) {
    const i = branch.index;
    if (branch.parent === -1) {
      out.x[i] = 0;
      out.y[i] = 0;
      continue;
    }
    // `side` is subtree membership, constant down a limb — so a limb drifts as
    // one piece instead of its own twigs dragging it back toward the trunk.
    out.x[i] =
      out.x[branch.parent] + Math.cos(branch.restAngle) * gap + branch.side * lateralStep;
    out.y[i] = out.y[branch.parent] + Math.sin(branch.restAngle) * gap - liftStep;
  }
}
