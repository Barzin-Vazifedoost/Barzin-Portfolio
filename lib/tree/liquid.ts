/**
 * The tree as a body of liquid rather than a diagram of lines.
 *
 * Every node is a blob and every branch a capsule joining two of them. Drawn
 * into a buffer and pushed through `blur` + `contrast`, overlapping mass fuses:
 * a fork stops being three strokes meeting at a point and becomes one mass with
 * a fillet in the crook of it, the way liquid actually sits at a junction. Tips
 * bead. Nothing here draws — this module only decides how much mass each part
 * of the tree carries, so the renderer stays about pixels.
 *
 * The interesting behaviour is at the joints, and it comes free from `split.ts`.
 * As you scroll, every joint opens by `jointGap × progress`. A parent's tip blob
 * and its child's base are then two masses being pulled apart, so the fused neck
 * between them thins, necks down, and snaps — surface tension, driven entirely
 * by scroll position. `neckWidth` is what makes that read as a stretching
 * filament rather than two circles drifting apart.
 */

import type { SimBranch } from "./simulate";

export const LIQUID = {
  /**
   * The liquid stops here, and this is the most important number in the file.
   *
   * Mass has to be proportional to the branch it sits on, and it has to fuse
   * with whatever is within a blur radius of it. In the outer canopy hundreds
   * of twigs sit a few pixels apart, so *any* mass there fuses with all of it
   * and the tree renders as one solid slab — which is what the first attempt
   * did. Past this depth the tree stays line work, which is also the better
   * picture: liquid pooling in the big joints, filigree at the tips.
   */
  maxDepth: 5,

  /**
   * Node blob radius as a multiple of the branch's stroke width. Deliberately
   * no floor — a floor is what defeats the width falloff and lets the deep
   * canopy merge.
   */
  nodeRadius: 1.35,
  /** Tips carry more mass than junctions — that is what makes them bead. */
  tipBonus: 1.28,
  /** Nodes that carry published content are heavier still. */
  anchorBonus: 1.55,

  /**
   * Capsule width as a multiple of the branch's stroke width. Above 1 so the
   * body always overlaps the blobs at either end and the whole limb reads as
   * one continuous mass instead of beads on a string.
   */
  bodyWidth: 1.15,

  /**
   * Alpha the mass is drawn at, before the threshold. Below 1 on purpose: a
   * lone blob then sits just under the threshold and barely registers, while
   * two overlapping ones clear it and fuse. That difference *is* the metaball —
   * at full alpha every shape crosses on its own and nothing appears to merge.
   */
  massAlpha: 0.78,

  /**
   * Surface tension, and the reason the liquid is worth having at all.
   *
   * Necks are drawn *directly*, not through the goo threshold. A filament thin
   * enough to read as surface tension is a one-pixel stroke, and a one-pixel
   * stroke blurred by six and thresholded is simply erased — which is exactly
   * what happened on the first attempt: joints opened and nothing spanned them.
   * Drawing them straight also means they pick up the bloom, so a stretching
   * neck glows as it thins.
   *
   * `neckBreak` is in CSS px and is tuned against the geometry in `split.ts`: at
   * full separation a joint's two ends are about 20px apart, so a break at 24
   * lets every neck stretch through the whole scroll and let go right at the
   * end.
   */
  neckBreak: 13,
  /**
   * Per-joint variation in where the filament lets go, as a fraction either
   * side of `neckBreak`. Without it every neck in the canopy snaps on the same
   * frame, which reads as a glitch; with it the tree comes apart as a cascade,
   * which is what something made of liquid actually does — and it leaves the
   * clean node-link diagram `split.ts` is aiming for, instead of gluing the
   * joints shut and never letting the separation finish.
   */
  neckBreakJitter: 0.36,
  /** Neck width at zero gap, as a fraction of the thinner of the two ends. */
  neckWidth: 0.5,
  /** Never thinner than this while it still exists, or it stops being visible. */
  neckWidthMin: 0.45,
  /**
   * How sharply the neck thins. Near 1 it thins evenly along the stretch, which
   * reads as a filament drawing out; much above 1 it disappears almost at once
   * and the joint just looks broken.
   */
  neckFalloff: 1.15,

  /**
   * A data pulse displaces the liquid it travels through, so the branch bulges
   * around it and the bulge moves with it. This is the one place the liquid
   * shows you the tree is carrying something.
   */
  pulseSwell: 3.4,

  /** Breathing, scaled off the simulation's own node breath. */
  breathGain: 0.55,
} as const;

/** Whether this branch carries liquid at all. */
export function hasMass(branch: SimBranch): boolean {
  return branch.depth <= LIQUID.maxDepth;
}

/** Mass radius for a node, in CSS px. `breath` is the simulation's 1±amount. */
export function nodeMass(branch: SimBranch, breath: number, isAnchor: boolean): number {
  const base = branch.width * LIQUID.nodeRadius;
  const weight = isAnchor ? LIQUID.anchorBonus : branch.isTip ? LIQUID.tipBonus : 1;
  // Only the breathing part of `breath` is scaled, so `breathGain` cannot
  // shrink the blob below its base radius.
  return base * weight * (1 + (breath - 1) * LIQUID.breathGain);
}

/** Capsule width for a branch body, in CSS px. */
export function bodyMass(branch: SimBranch): number {
  return branch.width * LIQUID.bodyWidth;
}

/**
 * Width of the neck spanning an opening joint, in CSS px. Returns 0 once the
 * gap is wide enough that the filament has broken.
 *
 * `gap` is the distance between the parent's tip and the child's base — which
 * is zero until `split.ts` starts displacing them, so this costs nothing and
 * changes nothing at the top of the page.
 */
/**
 * Where this particular joint's filament lets go, in CSS px.
 *
 * Derived from `rateJitter`, which the topology already carries and which is
 * stable for a given seed — so the cascade is deterministic. The same tree comes
 * apart in the same order every time, rather than shimmering frame to frame.
 */
export function neckBreakFor(branch: SimBranch): number {
  // rateJitter is 0.82–1.18; map it onto ±neckBreakJitter around 1.
  const unit = (branch.rateJitter - 0.82) / 0.36;
  return LIQUID.neckBreak * (1 - LIQUID.neckBreakJitter + unit * LIQUID.neckBreakJitter * 2);
}

export function neckWidth(
  gap: number,
  breakAt: number,
  parentWidth: number,
  childWidth: number,
): number {
  if (gap >= breakAt) return 0;
  const stretch = gap <= 0 ? 1 : 1 - gap / breakAt;
  const width =
    Math.min(parentWidth, childWidth) * LIQUID.neckWidth * Math.pow(stretch, LIQUID.neckFalloff);
  return Math.max(LIQUID.neckWidthMin, width);
}

/**
 * How brightly a neck burns as it stretches. Brightest just before it lets go —
 * a filament under tension thins faster than it dims, so the light per unit
 * area goes *up* right until it snaps. That flare is what sells it as liquid
 * rather than as a line being deleted.
 */
export function neckGlow(gap: number, breakAt: number): number {
  if (gap >= breakAt) return 0;
  const stretch = gap <= 0 ? 0 : gap / breakAt;
  // Ramps from resting to a flare at ~85% of the way out, then drops to nothing.
  if (stretch < 0.85) return 0.35 + stretch * 0.76;
  return (1 - stretch) / 0.15;
}
