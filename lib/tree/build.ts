/**
 * The tree's topology, as pure data.
 *
 * No DOM, no canvas, no React: given the same spec this returns the same tree,
 * on the server or in the browser. That determinism is the whole point of
 * pulling it out of the renderer — the shape can now be derived from what has
 * been published, addressed by id, and reasoned about without a canvas.
 *
 * Nothing here animates. Growth, wind and particles live in `simulate.ts`;
 * pixels live in `components/growth-tree.tsx`.
 */

import { clamp, createRng } from "./math";

/** Below this width the tree is treated as a phone: shallower and sparser. */
export const MOBILE_BREAKPOINT = 640;

/**
 * The tree's geometry depends on the viewport, so anything reasoning about the
 * structure away from a canvas — a server-rendered map of it, a social card —
 * builds against this instead. It is the desktop tree: the canonical one.
 */
export const CANONICAL_VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * Everything that decides what the plant *is*. These are the values that make
 * it read botanical rather than mechanical, and they were tuned by eye — change
 * them one at a time.
 */
export const STRUCTURE = {
  /** Recursion levels on a desktop viewport. */
  maxDepth: 9,
  /** Hard ceiling on branches (= nodes). */
  maxNodes: 700,
  /** Children per junction. */
  minChildren: 2,
  maxChildren: 3,
  /** Odds a junction continues as a single shoot instead of forking. */
  singleChildChance: 0.18,
  /** Per-level falloff — what makes it read botanical rather than mechanical. */
  lengthFalloff: 0.79,
  widthFalloff: 0.74,
  /** Root length as a fraction of the smaller viewport axis. */
  rootLengthRatio: 0.19,
  rootWidth: 10,
  /** Trunk position across the viewport. Left of centre: the text column sits
   *  to its left, the canopy opens to the right. */
  rootXRatio: 0.44,
  /** Seed sits slightly below the fold so the trunk enters from off-screen. */
  rootYOffset: 40,
  /** Fork half-angle and organic jitter (radians). */
  branchSpread: 0.52,
  angleJitter: 0.3,
  /** Forks narrow by this fraction by the time they reach `maxDepth`. */
  spreadDecay: 0.45,
  /** Restoring pull toward vertical, applied in world space each level. */
  gravitropism: 0.16,
  /** Whole-tree tilt, applied once at the root. A per-level bias would
   *  accumulate and spiral the canopy, which is not what this is for. */
  rootTilt: 0.14,
  /** Hard limits on how far any branch may deviate from the root angle.
   *  Asymmetric: the canopy opens wider away from the text column. */
  coneLeft: 0.95,
  coneRight: 1.3,
  /** Branches pointing right run this much longer. Applied once per branch,
   *  never compounded down the chain. */
  leanLengthBonus: 0.14,
  /** Per-branch bend of the quadratic curve, as a fraction of its length. */
  curvature: 0.07,
  /** Phone budgets. */
  mobileDepthDrop: 2,
  mobileNodeScale: 0.45,
} as const;

export type TreeBranch = {
  /**
   * Stable path from the root: `r`, `r.0`, `r.0.1`. Derived from position in
   * the hierarchy rather than from array order, so it survives a re-layout at
   * a different viewport size. This is the handle anything outside the canvas
   * uses to refer to a node.
   */
  id: string;
  /** Index into `branches`. Always greater than the parent's. */
  index: number;
  depth: number;
  /** Index of the parent branch, or -1 for the root. Always < own index. */
  parent: number;
  /** Angle relative to the parent's world angle. Absolute for the root. */
  localAngle: number;
  length: number;
  width: number;
  /** Signed bend applied to the quadratic control point. */
  curve: number;
  children: number[];
  isTip: boolean;
  breathOffset: number;
  swayPhase: number;
  /** Tips sway most; the trunk barely moves. */
  swayGain: number;
  /** Per-branch growth-rate variation at speed = 1. The simulation turns this
   *  into an actual rate, because how fast it grows is not a property of the
   *  shape. */
  rateJitter: number;
  /**
   * World angle with the tree fully grown and the air still. The simulation
   * recomputes this every frame with wind on top; this is the value anything
   * outside the animation should reason about.
   */
  restAngle: number;
  /** Where this branch's tip sits when fully grown and still. */
  restX: number;
  restY: number;
  /**
   * Which half of the tree this branch belongs to: -1 left, 1 right, 0 for the
   * root itself. Inherited from the limb it descends from, *not* read off its
   * own angle — a twig in the right subtree that happens to point left is still
   * part of the right subtree. Everything that means "writing versus work"
   * hangs off this, so the whole limb moves and reads as one thing.
   */
  side: -1 | 0 | 1;
};

export type TreeSpec = {
  width: number;
  height: number;
  /** Deterministic. Same seed and viewport, same tree. */
  seed: number;
  /** Branch-budget multiplier. Clamped to 0.4–2. */
  density?: number;
};

export type TreeTopology = {
  branches: TreeBranch[];
  /** Branch indices bucketed by depth — the renderer batches one path per depth. */
  byDepth: number[][];
  /** `id` → index, for addressing a node without walking the array. */
  byId: Map<string, number>;
  width: number;
  height: number;
  rootX: number;
  rootY: number;
  rootLength: number;
  maxDepth: number;
  /** The clamped density actually used, so particle budgets can match. */
  density: number;
};

export function buildTree({ width, height, seed, density = 1 }: TreeSpec): TreeTopology {
  const rng = createRng(seed);
  const densityScale = clamp(density, 0.4, 2);
  const isSmall = width < MOBILE_BREAKPOINT;

  const maxDepth = clamp(
    STRUCTURE.maxDepth - (isSmall ? STRUCTURE.mobileDepthDrop : 0),
    5,
    10,
  );
  const rootX = width * (isSmall ? 0.5 : STRUCTURE.rootXRatio);
  const rootY = height + STRUCTURE.rootYOffset;
  const rootLength = Math.min(width, height) * STRUCTURE.rootLengthRatio;
  const budgetNodes = Math.max(
    24,
    Math.round(
      STRUCTURE.maxNodes * densityScale * (isSmall ? STRUCTURE.mobileNodeScale : 1),
    ),
  );

  const branches: TreeBranch[] = [];

  const push = (
    id: string,
    depth: number,
    parent: number,
    localAngle: number,
    restAngle: number,
    length: number,
    strokeWidth: number,
  ): number => {
    const index = branches.length;
    branches.push({
      id,
      index,
      depth,
      parent,
      localAngle,
      length,
      width: strokeWidth,
      curve: (rng() - 0.5) * 2 * STRUCTURE.curvature,
      rateJitter: 0.82 + rng() * 0.36,
      children: [],
      isTip: true,
      breathOffset: rng() * Math.PI * 2,
      swayPhase: rng() * Math.PI * 2,
      swayGain: Math.pow(depth / Math.max(1, maxDepth), 1.5),
      restAngle,
      // Filled by the forward pass below, once every parent is known.
      restX: 0,
      restY: 0,
      side: 0,
    });
    return index;
  };

  const rootAngle = -Math.PI / 2 + STRUCTURE.rootTilt;
  // Hard cone around vertical. Without this, a chain that keeps taking the
  // same fork accumulates unbounded rotation and curls into a spiral —
  // gravitropism alone is far too weak to hold ±branchSpread per level.
  const minWorld = rootAngle - STRUCTURE.coneLeft;
  const maxWorld = rootAngle + STRUCTURE.coneRight;

  type Pending = { index: number; worldAngle: number };
  const rootIndex = push("r", 0, -1, rootAngle, rootAngle, rootLength, STRUCTURE.rootWidth);
  const queue: Pending[] = [{ index: rootIndex, worldAngle: rootAngle }];

  for (let head = 0; head < queue.length && branches.length < budgetNodes; head += 1) {
    const parent = queue[head];
    const parentBranch = branches[parent.index];
    if (parentBranch.depth >= maxDepth) continue;

    const depth = parentBranch.depth + 1;
    const forks =
      rng() < STRUCTURE.singleChildChance
        ? 1
        : STRUCTURE.minChildren +
          Math.floor(rng() * (STRUCTURE.maxChildren - STRUCTURE.minChildren + 1));

    // Forks narrow with depth, the way real branching does.
    const spreadScale =
      STRUCTURE.branchSpread * (1 - STRUCTURE.spreadDecay * (depth / Math.max(1, maxDepth)));

    for (let i = 0; i < forks; i += 1) {
      if (branches.length >= budgetNodes) break;

      const spread = forks === 1 ? 0 : (i / (forks - 1) - 0.5) * 2;

      // Composed in WORLD space: gravitropism has to pull the absolute angle
      // back toward vertical. Applying it to the parent-relative angle is not
      // a restoring force at all.
      let world =
        parent.worldAngle + spread * spreadScale + (rng() - 0.5) * STRUCTURE.angleJitter;
      world += (rootAngle - world) * STRUCTURE.gravitropism;
      world = clamp(world, minWorld, maxWorld);

      // Length is derived from depth rather than multiplied down the chain, so
      // the rightward bonus cannot compound into branches longer than the trunk.
      const rightness = Math.max(0, Math.cos(world));
      const length =
        rootLength *
        Math.pow(STRUCTURE.lengthFalloff, depth) *
        (0.86 + rng() * 0.28) *
        (1 + STRUCTURE.leanLengthBonus * rightness);
      const strokeWidth = STRUCTURE.rootWidth * Math.pow(STRUCTURE.widthFalloff, depth);

      const index = push(
        `${parentBranch.id}.${i}`,
        depth,
        parent.index,
        world - parent.worldAngle,
        world,
        length,
        strokeWidth,
      );
      parentBranch.children.push(index);
      parentBranch.isTip = false;
      queue.push({ index, worldAngle: world });
    }
  }

  // Rest positions, in one forward pass — parents always precede their
  // children, so a single sweep resolves the whole hierarchy. These are what
  // anything outside the animation (grafting, the camera) reasons about.
  const byDepth: number[][] = Array.from({ length: maxDepth + 1 }, () => [] as number[]);
  const byId = new Map<string, number>();
  for (const branch of branches) {
    const ax = branch.parent === -1 ? rootX : branches[branch.parent].restX;
    const ay = branch.parent === -1 ? rootY : branches[branch.parent].restY;
    branch.restX = ax + Math.cos(branch.restAngle) * branch.length;
    branch.restY = ay + Math.sin(branch.restAngle) * branch.length;

    // Side is decided once, at the first fork off the trunk, then inherited.
    if (branch.parent === -1) branch.side = 0;
    else if (branches[branch.parent].side !== 0) branch.side = branches[branch.parent].side;
    else branch.side = branch.restAngle < rootAngle ? -1 : 1;

    byDepth[branch.depth].push(branch.index);
    byId.set(branch.id, branch.index);
  }

  return {
    branches,
    byDepth,
    byId,
    width,
    height,
    rootX,
    rootY,
    rootLength,
    maxDepth,
    density: densityScale,
  };
}
