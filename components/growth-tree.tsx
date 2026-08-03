"use client";

import { useEffect, useMemo, useRef } from "react";

import { TREE_SURGE_EVENT } from "@/lib/tree-events";

/**
 * A hybrid organic-tree / data-graph background. Branches are edges, junctions
 * and tips are nodes, and the structure unfurls from a seed near the bottom.
 *
 * Self-contained by design: Canvas 2D + rAF, no dependencies, no imports from
 * the content layer. Everything it needs arrives as props, so the server stays
 * the only thing that touches `content/`.
 *
 * Branches store an angle *relative to their parent*, which is what lets wind
 * sway accumulate down the hierarchy instead of being faked per-branch.
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

/**
 * Every tunable lives here. Props scale these at runtime; the constants are the
 * shape and behaviour of the plant itself.
 */
const TUNING = {
  // ── Structure ────────────────────────────────────────────────────────────
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

  // ── Growth ───────────────────────────────────────────────────────────────
  /** Seconds for the deepest chain to unfurl at `speed = 1`. */
  growthSeconds: 5.5,
  /** A branch spawns its children once its own progress crosses this. */
  spawnThreshold: 0.62,

  // ── Wind ─────────────────────────────────────────────────────────────────
  windSpeed: 0.55,
  /** Radians of sway at the tips, accumulated down the chain. */
  windAmount: 0.055,

  // ── Data pulses ──────────────────────────────────────────────────────────
  pulseIntervalSeconds: 0.42,
  pulsePixelsPerSecond: 210,
  maxPulses: 64,
  /** Pulses injected per hover surge. */
  surgePulses: 5,

  // ── Particles ────────────────────────────────────────────────────────────
  sporesPerMegapixel: 46,
  maxSpores: 120,
  sporeRisePixelsPerSecond: 14,
  sparkChancePerSecond: 5,
  maxSparks: 80,
  sparkLifeSeconds: 1.1,

  // ── Nodes ────────────────────────────────────────────────────────────────
  breathSpeed: 1.7,
  breathAmount: 0.34,

  // ── Scroll ───────────────────────────────────────────────────────────────
  /** Pixels the whole scene drifts down as you scroll top → bottom. */
  cameraDrift: 300,
  /** Extra drift applied to the deepest layer, for parallax volume. */
  parallaxDepth: 190,

  // ── Canopy veil ──────────────────────────────────────────────────────────
  /** As you climb, drifting mist rolls up through the canopy and the tree
   *  dissolves behind it into a field of spores. All driven by scroll. */
  /** How far the tree fades out by the bottom of the page. */
  veilTreeFade: 0.78,
  /** Peak opacity of a single mist blob. */
  veilStrength: 0.86,
  veilBlobs: 7,
  /** Blob radius as a fraction of the viewport's smaller axis. */
  veilBlobRadius: 0.62,
  veilDriftSpeed: 0.07,
  /** Spores brighten and swell as the tree recedes, so something takes over. */
  veilSporeGain: 1.6,
  veilSporeSwell: 0.6,

  // ── Render ───────────────────────────────────────────────────────────────
  /** Bloom buffer scale and blur radius, in buffer pixels. */
  bloomScale: 0.3,
  bloomBlur: 8,
  bloomStrength: 0.9,
  /** Shadow radius, now used only on the few small bright passes. */
  glowBlur: 10,
  vignetteStrength: 0.72,
  groundGlowRadius: 0.55,
  /** Backdrop gradients are baked once at this scale, then upscaled. The bake
   *  happens on resize only and the per-frame cost is a blit either way, so
   *  this is set for fidelity (low values band visibly) rather than speed. */
  backdropScale: 0.5,

  // ── Performance ──────────────────────────────────────────────────────────
  /** Render cap. Ambient motion reads fine well below 60, and this is the
   *  single biggest saving on a busy page. */
  targetFps: 30,
  /** Reduced cap while the user is actively scrolling: the main thread is
   *  busy with the DOM then, and the tree is not what is being looked at. */
  scrollFps: 18,
  /** How long after the last scroll event to keep using `scrollFps`. */
  scrollQuietMs: 180,
  /** A frame slower than this counts against the quality budget. */
  slowFrameMs: 22,
  /** Consecutive slow frames before bloom is dropped. One-way. */
  slowFrameLimit: 40,

  // ── Budgets ──────────────────────────────────────────────────────────────
  mobileBreakpoint: 640,
  mobileDepthDrop: 2,
  mobileNodeScale: 0.45,
  mobileSporeScale: 0.4,
  /** Well below retina on purpose: the canvas is a soft, bloomed glow, so
   *  extra pixels buy almost nothing visible and cost a lot. */
  maxDpr: 1.25,
  mobileDpr: 1,
} as const;

export type GrowthTreeProps = {
  /** Scales branch budget and particle counts. 1 = default. Clamped to 0.4–2. */
  density?: number;
  /** Growth and pulse rate multiplier. 1 = default. Clamped to 0.25–3. */
  speed?: number;
  /** Partial palette override; unset keys fall back to `GROWTH_TREE_PALETTE`. */
  palette?: Partial<GrowthTreePalette>;
  /** Replaces the default fixed full-viewport positioning. */
  className?: string;
};

type Rgb = { r: number; g: number; b: number };

type Branch = {
  depth: number;
  /** Index of the parent branch, or -1 for the root. Always < own index. */
  parent: number;
  /** Angle relative to the parent's world angle. Absolute for the root. */
  localAngle: number;
  length: number;
  width: number;
  /** Signed bend applied to the quadratic control point. */
  curve: number;
  /** 0 → 1. Children activate once this crosses `spawnThreshold`. */
  progress: number;
  rate: number;
  active: boolean;
  spawned: boolean;
  children: number[];
  isTip: boolean;
  breathOffset: number;
  swayPhase: number;
  swayGain: number;
  /** Recomputed every frame by `solve`. */
  worldAngle: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
};

type Pulse = { branch: number; t: number; bright: number };
type Spore = { x: number; y: number; drift: number; rise: number; radius: number; phase: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return { r: 255, g: 255, b: 255 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgba(color: Rgb, alpha: number): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
}

/** mulberry32 — deterministic per seed, so a replant is reproducible. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Control point of a branch's quadratic curve. Anything that has to sit on a
 * branch must derive its position from this, or it drifts off the rendered
 * path — the chord between the endpoints is not the shape being drawn.
 */
function branchControl(branch: Branch): { cx: number; cy: number } {
  const dx = branch.bx - branch.ax;
  const dy = branch.by - branch.ay;
  return {
    cx: (branch.ax + branch.bx) / 2 - dy * branch.curve,
    cy: (branch.ay + branch.by) / 2 + dx * branch.curve,
  };
}

/** Point at `t` (0–1) along the branch's rendered curve. */
function pointOnBranch(branch: Branch, t: number): { x: number; y: number } {
  const { cx, cy } = branchControl(branch);
  const inv = 1 - t;
  const a = inv * inv;
  const b = 2 * inv * t;
  const c = t * t;
  return {
    x: a * branch.ax + b * cx + c * branch.bx,
    y: a * branch.ay + b * cy + c * branch.by,
  };
}

export default function GrowthTree({
  density = 1,
  speed = 1,
  palette,
  className,
}: GrowthTreeProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Depend on the resolved strings rather than object identity, so callers can
  // pass an inline palette literal without re-running the whole simulation.
  const { bg, deep, mid, neon, core } = { ...GROWTH_TREE_PALETTE, ...palette };
  const colors = useMemo(
    () => ({
      bg: hexToRgb(bg),
      deep: hexToRgb(deep),
      mid: hexToRgb(mid),
      neon: hexToRgb(neon),
      core: hexToRgb(core),
    }),
    [bg, deep, mid, neon, core],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Offscreen buffers: the scene is rendered once, then composited twice —
    // straight, and blurred-and-additive for bloom.
    const sceneCanvas = document.createElement("canvas");
    const sceneCtx = sceneCanvas.getContext("2d");
    const bloomCanvas = document.createElement("canvas");
    const bloomCtx = bloomCanvas.getContext("2d");
    // Backdrops are baked once per resize instead of evaluated per frame.
    const glowCanvas = document.createElement("canvas");
    const glowCtx = glowCanvas.getContext("2d");
    const vignetteCanvas = document.createElement("canvas");
    const vignetteCtx = vignetteCanvas.getContext("2d");
    // One soft blob, baked once and reused for every mist puff.
    const mistCanvas = document.createElement("canvas");
    const mistCtx = mistCanvas.getContext("2d");
    if (!sceneCtx || !bloomCtx || !glowCtx || !vignetteCtx || !mistCtx) return;

    /** Turned off permanently if the device cannot keep up. */
    let bloomOn = typeof sceneCtx.filter === "string";
    let slowFrames = 0;

    const densityScale = clamp(density, 0.4, 2);
    const speedScale = clamp(speed, 0.25, 3);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let width = 0;
    let height = 0;
    let dpr = 1;
    let maxDepth: number = TUNING.maxDepth;
    let rootX = 0;
    let rootY = 0;
    let branches: Branch[] = [];
    let byDepth: number[][] = [];
    let pulses: Pulse[] = [];
    let spores: Spore[] = [];
    let sparks: Spark[] = [];
    let trunkGradient: CanvasGradient | null = null;
    let elapsed = 0;
    let sincePulse = 0;
    let scrollProgress = 0;
    let scrollRange = 0;
    let pending = 0;
    let lastScrollAt = 0;
    let seed = Math.floor(Math.random() * 0xffffffff);
    let frameId = 0;
    let lastTime = 0;
    let onScreen = true;

    const buildTree = (rng: () => number, budgetNodes: number): void => {
      branches = [];
      const rootLength = Math.min(width, height) * TUNING.rootLengthRatio;
      const perBranch =
        TUNING.growthSeconds / (1 + TUNING.spawnThreshold * Math.max(1, maxDepth - 1));

      type Pending = { index: number; worldAngle: number };

      const push = (
        depth: number,
        parent: number,
        localAngle: number,
        length: number,
        strokeWidth: number,
      ): number => {
        const index = branches.length;
        branches.push({
          depth,
          parent,
          localAngle,
          length,
          width: strokeWidth,
          curve: (rng() - 0.5) * 2 * TUNING.curvature,
          progress: 0,
          rate: (1 / perBranch) * (0.82 + rng() * 0.36) * speedScale,
          active: depth === 0,
          spawned: false,
          children: [],
          isTip: true,
          breathOffset: rng() * Math.PI * 2,
          swayPhase: rng() * Math.PI * 2,
          // Tips sway most; the trunk barely moves.
          swayGain: Math.pow(depth / Math.max(1, maxDepth), 1.5),
          worldAngle: 0,
          ax: 0,
          ay: 0,
          bx: 0,
          by: 0,
        });
        return index;
      };

      const rootAngle = -Math.PI / 2 + TUNING.rootTilt;
      // Hard cone around vertical. Without this, a chain that keeps taking the
      // same fork accumulates unbounded rotation and curls into a spiral —
      // gravitropism alone is far too weak to hold ±branchSpread per level.
      const minWorld = rootAngle - TUNING.coneLeft;
      const maxWorld = rootAngle + TUNING.coneRight;

      const rootIndex = push(0, -1, rootAngle, rootLength, TUNING.rootWidth);
      const queue: Pending[] = [
        { index: rootIndex, worldAngle: rootAngle },
      ];

      for (let head = 0; head < queue.length && branches.length < budgetNodes; head += 1) {
        const parent = queue[head];
        const parentBranch = branches[parent.index];
        if (parentBranch.depth >= maxDepth) continue;

        const depth = parentBranch.depth + 1;
        const forks =
          rng() < TUNING.singleChildChance
            ? 1
            : TUNING.minChildren +
              Math.floor(rng() * (TUNING.maxChildren - TUNING.minChildren + 1));

        // Forks narrow with depth, the way real branching does.
        const spreadScale =
          TUNING.branchSpread * (1 - TUNING.spreadDecay * (depth / Math.max(1, maxDepth)));

        for (let i = 0; i < forks; i += 1) {
          if (branches.length >= budgetNodes) break;

          const spread = forks === 1 ? 0 : (i / (forks - 1) - 0.5) * 2;

          // Composed in WORLD space: gravitropism has to pull the absolute
          // angle back toward vertical. Applying it to the parent-relative
          // angle (as this did) is not a restoring force at all.
          let world = parent.worldAngle + spread * spreadScale + (rng() - 0.5) * TUNING.angleJitter;
          world += (rootAngle - world) * TUNING.gravitropism;
          world = clamp(world, minWorld, maxWorld);

          // Length is derived from depth rather than multiplied down the
          // chain, so the rightward bonus cannot compound into branches that
          // are longer than the trunk.
          const rightness = Math.max(0, Math.cos(world));
          const length =
            rootLength *
            Math.pow(TUNING.lengthFalloff, depth) *
            (0.86 + rng() * 0.28) *
            (1 + TUNING.leanLengthBonus * rightness);
          const strokeWidth = TUNING.rootWidth * Math.pow(TUNING.widthFalloff, depth);

          const index = push(depth, parent.index, world - parent.worldAngle, length, strokeWidth);
          parentBranch.children.push(index);
          parentBranch.isTip = false;
          queue.push({ index, worldAngle: world });
        }
      }

      byDepth = Array.from({ length: maxDepth + 1 }, () => [] as number[]);
      for (const [index, branch] of branches.entries()) {
        byDepth[branch.depth].push(index);
      }
    };

    const seedSpores = (rng: () => number, budgetSpores: number): void => {
      spores = Array.from({ length: budgetSpores }, () => ({
        x: rng() * width,
        y: rng() * height,
        drift: 6 + rng() * 14,
        rise: TUNING.sporeRisePixelsPerSecond * (0.5 + rng()),
        radius: 0.6 + rng() * 1.5,
        phase: rng() * Math.PI * 2,
      }));
    };

    /**
     * Height-based colour ramp: emerald at the roots, mint at the tips. Applied
     * as a gradient on the stroke so it survives per-depth batching.
     */
    const buildGradient = (): void => {
      const rootLength = Math.min(width, height) * TUNING.rootLengthRatio;
      const reach = (rootLength / (1 - TUNING.lengthFalloff)) * 0.85;
      const gradient = ctx.createLinearGradient(0, rootY, 0, Math.max(0, rootY - reach));
      gradient.addColorStop(0, rgba(colors.deep, 1));
      gradient.addColorStop(0.45, rgba(colors.mid, 1));
      gradient.addColorStop(0.85, rgba(colors.core, 1));
      gradient.addColorStop(1, rgba(colors.core, 1));
      trunkGradient = gradient;
    };

    const plant = (): void => {
      const rng = createRng(seed);
      const isSmall = width < TUNING.mobileBreakpoint;

      maxDepth = clamp(TUNING.maxDepth - (isSmall ? TUNING.mobileDepthDrop : 0), 5, 10);
      rootX = width * (isSmall ? 0.5 : TUNING.rootXRatio);
      rootY = height + TUNING.rootYOffset;

      const budgetNodes = Math.max(
        24,
        Math.round(TUNING.maxNodes * densityScale * (isSmall ? TUNING.mobileNodeScale : 1)),
      );
      const budgetSpores = Math.round(
        Math.min(
          TUNING.maxSpores,
          ((width * height) / 1_000_000) *
            TUNING.sporesPerMegapixel *
            densityScale *
            (isSmall ? TUNING.mobileSporeScale : 1),
        ),
      );

      buildTree(rng, budgetNodes);
      seedSpores(rng, Math.max(0, budgetSpores));
      buildGradient();
      pulses = [];
      sparks = [];
      elapsed = 0;
      sincePulse = 0;
    };

    /**
     * Resolves world angles and endpoints for the whole hierarchy in one pass.
     * Parents always precede children in the array, so a single forward loop is
     * enough — and sway accumulates naturally from trunk to tip.
     */
    const solve = (time: number, sway: boolean): void => {
      for (const branch of branches) {
        const wobble = sway
          ? Math.sin(time * TUNING.windSpeed + branch.swayPhase) *
            branch.swayGain *
            TUNING.windAmount
          : 0;

        if (branch.parent === -1) {
          branch.worldAngle = branch.localAngle + wobble;
          branch.ax = rootX;
          branch.ay = rootY;
        } else {
          const parent = branches[branch.parent];
          branch.worldAngle = parent.worldAngle + branch.localAngle + wobble;
          branch.ax = parent.bx;
          branch.ay = parent.by;
        }

        const reach = branch.length * easeOut(branch.progress);
        branch.bx = branch.ax + Math.cos(branch.worldAngle) * reach;
        branch.by = branch.ay + Math.sin(branch.worldAngle) * reach;
      }
    };

    const surge = (): void => {
      for (let i = 0; i < TUNING.surgePulses; i += 1) {
        if (pulses.length >= TUNING.maxPulses) break;
        pulses.push({ branch: 0, t: (i / TUNING.surgePulses) * 0.6, bright: 1.6 });
      }
    };

    const step = (dt: number): void => {
      elapsed += dt;

      for (const branch of branches) {
        if (!branch.active || branch.progress >= 1) continue;
        branch.progress = Math.min(1, branch.progress + dt * branch.rate);

        if (!branch.spawned && branch.progress >= TUNING.spawnThreshold) {
          branch.spawned = true;
          for (const child of branch.children) branches[child].active = true;
        }

        if (branch.isTip && sparks.length < TUNING.maxSparks) {
          if (Math.random() < TUNING.sparkChancePerSecond * dt) {
            sparks.push({
              x: branch.bx,
              y: branch.by,
              vx: (Math.random() - 0.5) * 22,
              vy: -12 - Math.random() * 26,
              life: TUNING.sparkLifeSeconds,
            });
          }
        }
      }

      sincePulse += dt;
      const interval = TUNING.pulseIntervalSeconds / speedScale;
      if (sincePulse >= interval && branches.length > 0) {
        sincePulse -= interval;
        if (pulses.length < TUNING.maxPulses && branches[0].progress > 0.2) {
          pulses.push({ branch: 0, t: 0, bright: 1 });
        }
      }

      const pulseSpeed = TUNING.pulsePixelsPerSecond * speedScale;
      pulses = pulses.filter((pulse) => {
        const branch = branches[pulse.branch];
        if (!branch) return false;
        pulse.t += (dt * pulseSpeed) / Math.max(1, branch.length);
        if (pulse.t < 1) return true;

        const grown = branch.children.filter((child) => branches[child].progress > 0.35);
        if (grown.length === 0) return false;
        pulse.branch = grown[Math.floor(Math.random() * grown.length)];
        pulse.t = 0;
        return true;
      });

      for (const spore of spores) {
        spore.y -= spore.rise * dt;
        spore.x += Math.sin(elapsed * 0.6 + spore.phase) * spore.drift * dt;
        if (spore.y < -8) {
          spore.y = height + 8;
          spore.x = Math.random() * width;
        }
      }

      sparks = sparks.filter((spark) => {
        spark.life -= dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += 6 * dt;
        return spark.life > 0;
      });
    };

    /**
     * Draws the luminous half of the frame. `clear` is set when rendering into
     * the offscreen bloom buffer; the direct path paints over the backdrop.
     */
    const drawInto = (target: CanvasRenderingContext2D, clear: boolean): void => {
      target.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (clear) target.clearRect(0, 0, width, height);
      target.globalCompositeOperation = "lighter";
      target.lineCap = "round";
      target.lineJoin = "round";

      const camera = scrollProgress * TUNING.cameraDrift;
      /** Vertical offset for a given depth. Everything anchored to a branch
       *  must use this so it scrolls with the branch, not against it. */
      const depthShift = (depth: number): number =>
        camera + scrollProgress * TUNING.parallaxDepth * (depth / Math.max(1, maxDepth));
      /** The tree recedes as the veil rolls in. Applied to branch-anchored
       *  passes only — the spores deliberately survive to carry the scene. */
      const treeAlpha = 1 - scrollProgress * TUNING.veilTreeFade;

      // Edges, one batched path per depth: shared width, alpha and parallax.
      for (let depth = 0; depth < byDepth.length; depth += 1) {
        const indices = byDepth[depth];
        if (!indices || indices.length === 0) continue;

        const depthT = depth / Math.max(1, maxDepth);
        // Deeper layers ride further with scroll, which reads as volume.
        const parallax = depthShift(depth);

        target.save();
        target.translate(0, parallax);
        target.strokeStyle = trunkGradient ?? rgba(colors.mid, 1);
        // Atmospheric dimming: distance into the canopy fades out.
        target.globalAlpha = (0.92 - 0.4 * depthT) * treeAlpha;
        target.lineWidth = Math.max(
          0.6,
          TUNING.rootWidth * Math.pow(TUNING.widthFalloff, depth),
        );
        target.shadowBlur = 0;

        target.beginPath();
        for (const index of indices) {
          const branch = branches[index];
          if (!branch.active || branch.progress <= 0) continue;
          const { cx, cy } = branchControl(branch);
          target.moveTo(branch.ax, branch.ay);
          target.quadraticCurveTo(cx, cy, branch.bx, branch.by);
        }
        target.stroke();
        target.restore();
      }

      // Bright leading edge of everything still growing. No global translate:
      // each head carries its own branch's parallax so it stays welded on.
      target.globalAlpha = treeAlpha;
      target.strokeStyle = rgba(colors.neon, 0.8);
      target.lineWidth = 1.6;
      target.shadowBlur = TUNING.glowBlur * 1.4;
      target.shadowColor = rgba(colors.neon, 0.9);
      target.beginPath();
      for (const branch of branches) {
        if (!branch.active || branch.progress <= 0 || branch.progress >= 1) continue;
        const eased = easeOut(branch.progress);
        const back = Math.max(0, eased - 0.14) / Math.max(0.0001, eased);
        const shift = depthShift(branch.depth);
        const from = pointOnBranch(branch, back);
        target.moveTo(from.x, from.y + shift);
        target.lineTo(branch.bx, branch.by + shift);
      }
      target.stroke();

      // Nodes, batched per depth. Tips breathe; buds glow brighter.
      for (let depth = 0; depth < byDepth.length; depth += 1) {
        const indices = byDepth[depth];
        if (!indices || indices.length === 0) continue;

        const depthT = depth / Math.max(1, maxDepth);
        const parallax = depthShift(depth);

        target.save();
        target.translate(0, parallax);
        target.fillStyle = rgba(colors.core, 1);
        target.globalAlpha = (0.95 - 0.45 * depthT) * treeAlpha;
        target.shadowBlur = 0;

        target.beginPath();
        for (const index of indices) {
          const branch = branches[index];
          if (!branch.active || branch.progress < 0.98) continue;
          const breath = branch.isTip
            ? 1 + Math.sin(elapsed * TUNING.breathSpeed + branch.breathOffset) * TUNING.breathAmount
            : 1;
          const radius = Math.max(1, branch.width * 0.62) * breath;
          target.moveTo(branch.bx + radius, branch.by);
          target.arc(branch.bx, branch.by, radius, 0, Math.PI * 2);
        }
        target.fill();
        target.restore();
      }

      // Data pulses ride the branch's rendered curve and pick up the same
      // per-depth parallax as the edge they travel along. Interpolating the
      // chord instead is what made them drift off the branch.
      if (pulses.length > 0) {
        target.globalAlpha = treeAlpha;
        target.fillStyle = rgba(colors.core, 0.95);
        target.shadowBlur = TUNING.glowBlur * 1.5;
        target.shadowColor = rgba(colors.neon, 1);
        target.beginPath();
        for (const pulse of pulses) {
          const branch = branches[pulse.branch];
          if (!branch) continue;
          const point = pointOnBranch(branch, Math.min(1, pulse.t));
          const y = point.y + depthShift(branch.depth);
          const radius = 2.2 * pulse.bright;
          target.moveTo(point.x + radius, y);
          target.arc(point.x, y, radius, 0, Math.PI * 2);
        }
        target.fill();
      }

      // Ambient particles are not attached to any branch, so they only take
      // the camera offset.
      target.save();
      target.translate(0, camera);
      target.globalAlpha = 1;

      // Ambient spores, bucketed into alpha tiers to keep the fill count low.
      target.shadowBlur = 0;
      const sporeGain = 1 + scrollProgress * TUNING.veilSporeGain;
      const sporeSwell = 1 + scrollProgress * TUNING.veilSporeSwell;
      for (let tier = 0; tier < 3; tier += 1) {
        target.fillStyle = rgba(colors.mid, Math.min(1, (0.18 + tier * 0.14) * sporeGain));
        target.beginPath();
        for (let i = tier; i < spores.length; i += 3) {
          const spore = spores[i];
          const radius = spore.radius * sporeSwell;
          target.moveTo(spore.x + radius, spore.y);
          target.arc(spore.x, spore.y, radius, 0, Math.PI * 2);
        }
        target.fill();
      }

      // Emission from tips that are actively growing.
      if (sparks.length > 0) {
        target.shadowBlur = 0;
        for (let tier = 0; tier < 3; tier += 1) {
          target.fillStyle = rgba(colors.neon, 0.15 + tier * 0.2);
          target.beginPath();
          for (let i = tier; i < sparks.length; i += 3) {
            const spark = sparks[i];
            const radius = 1.4 * (spark.life / TUNING.sparkLifeSeconds);
            if (radius <= 0) continue;
            target.moveTo(spark.x + radius, spark.y);
            target.arc(spark.x, spark.y, radius, 0, Math.PI * 2);
          }
          target.fill();
        }
      }

      target.restore();
      target.shadowBlur = 0;
    };

    /**
     * Bakes the ground glow and vignette once per resize. Both are smooth
     * radial gradients over the full viewport; evaluating them per pixel every
     * frame was two of the most expensive operations in the loop.
     */
    const bakeBackdrops = (): void => {
      const bw = Math.max(1, Math.round(width * TUNING.backdropScale));
      const bh = Math.max(1, Math.round(height * TUNING.backdropScale));
      const scale = TUNING.backdropScale;

      glowCanvas.width = bw;
      glowCanvas.height = bh;
      glowCtx.clearRect(0, 0, bw, bh);
      const glowRadius = Math.min(width, height) * TUNING.groundGlowRadius * scale;
      const glow = glowCtx.createRadialGradient(
        rootX * scale,
        rootY * scale,
        0,
        rootX * scale,
        rootY * scale,
        glowRadius,
      );
      glow.addColorStop(0, rgba(colors.deep, 0.55));
      glow.addColorStop(0.5, rgba(colors.deep, 0.16));
      glow.addColorStop(1, rgba(colors.deep, 0));
      glowCtx.fillStyle = glow;
      glowCtx.fillRect(0, 0, bw, bh);

      vignetteCanvas.width = bw;
      vignetteCanvas.height = bh;
      vignetteCtx.clearRect(0, 0, bw, bh);
      const vignetteRadius = Math.hypot(width, height) * 0.62 * scale;
      const vignette = vignetteCtx.createRadialGradient(
        bw * 0.5,
        bh * 0.45,
        vignetteRadius * 0.35,
        bw * 0.5,
        bh * 0.45,
        vignetteRadius,
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, `rgba(0, 0, 0, ${TUNING.vignetteStrength})`);
      vignetteCtx.fillStyle = vignette;
      vignetteCtx.fillRect(0, 0, bw, bh);

      // Mist blob: viewport-independent, always drawn scaled to size.
      const mistSize = 256;
      mistCanvas.width = mistSize;
      mistCanvas.height = mistSize;
      mistCtx.clearRect(0, 0, mistSize, mistSize);
      const puff = mistCtx.createRadialGradient(
        mistSize / 2,
        mistSize / 2,
        0,
        mistSize / 2,
        mistSize / 2,
        mistSize / 2,
      );
      // Tinted toward the background so it veils the tree rather than glowing.
      puff.addColorStop(0, "rgba(6, 16, 9, 0.95)");
      puff.addColorStop(0.55, "rgba(6, 14, 8, 0.5)");
      puff.addColorStop(1, "rgba(5, 8, 5, 0)");
      mistCtx.fillStyle = puff;
      mistCtx.fillRect(0, 0, mistSize, mistSize);
    };

    /**
     * Drifting mist that rolls up through the canopy as you scroll. Seven
     * scaled blits of one cached blob — cheap enough to run alongside
     * everything else.
     */
    const drawVeil = (): void => {
      if (scrollProgress <= 0.002) return;
      const radius = Math.min(width, height) * TUNING.veilBlobRadius;

      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < TUNING.veilBlobs; i += 1) {
        const phase = i * 1.7;
        const x =
          width * (0.12 + 0.78 * ((i + 0.5) / TUNING.veilBlobs)) +
          Math.sin(elapsed * TUNING.veilDriftSpeed + phase) * width * 0.07;
        // Sits below the fold at rest and climbs into frame with scroll.
        const y =
          height * (1.15 - 0.85 * scrollProgress) +
          Math.cos(elapsed * TUNING.veilDriftSpeed * 0.8 + phase) * height * 0.05 +
          ((i % 3) - 1) * height * 0.16;
        ctx.globalAlpha =
          scrollProgress * TUNING.veilStrength * (0.5 + 0.5 * Math.abs(Math.sin(phase)));
        ctx.drawImage(mistCanvas, x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.globalAlpha = 1;
    };

    const draw = (): void => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgba(colors.bg, 1);
      ctx.fillRect(0, 0, width, height);

      // Ground glow rides the camera, so it is blitted with the scroll offset.
      const camera = scrollProgress * TUNING.cameraDrift;
      ctx.drawImage(glowCanvas, 0, camera, width, height);

      if (bloomOn) {
        // Render once into the scene buffer, then composite it twice.
        drawInto(sceneCtx, true);
        ctx.drawImage(sceneCanvas, 0, 0, width, height);

        bloomCtx.setTransform(1, 0, 0, 1, 0, 0);
        bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
        bloomCtx.filter = `blur(${TUNING.bloomBlur}px)`;
        bloomCtx.drawImage(sceneCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height);
        bloomCtx.filter = "none";

        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = TUNING.bloomStrength;
        ctx.drawImage(bloomCanvas, 0, 0, width, height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      } else {
        // No bloom: skip the offscreen buffer entirely and draw straight to
        // the visible canvas, which saves a full-resolution blit per frame.
        drawInto(ctx, false);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }

      drawVeil();
      ctx.drawImage(vignetteCanvas, 0, 0, width, height);
    };

    /** Fast-forwards to a fully grown tree for the reduced-motion frame. */
    const settle = (): void => {
      const dt = 1 / 60;
      const steps = Math.ceil(((TUNING.growthSeconds / speedScale) * 1.6 + 1) * 60);
      for (let i = 0; i < steps; i += 1) step(dt);
      pulses = [];
      sparks = [];
    };

    const frame = (now: number): void => {
      frameId = requestAnimationFrame(frame);
      // Clamp so a backgrounded tab does not resume with one enormous delta.
      const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
      lastTime = now;
      pending += dt;

      // Cap the render rate, and back off further while scrolling so the main
      // thread is free for the DOM. Simulation time still accumulates
      // accurately, so growth and wind run at the same speed — fewer frames.
      const scrolling = now - lastScrollAt < TUNING.scrollQuietMs;
      const frameInterval = 1 / (scrolling ? TUNING.scrollFps : TUNING.targetFps);
      if (pending < frameInterval) return;

      const started = performance.now();
      step(pending);
      solve(elapsed, true);
      draw();
      pending = 0;

      // One-way quality degrade: if the device is consistently missing the
      // budget, drop bloom rather than keep stuttering.
      if (bloomOn) {
        if (performance.now() - started > TUNING.slowFrameMs) {
          slowFrames += 1;
          if (slowFrames > TUNING.slowFrameLimit) bloomOn = false;
        } else if (slowFrames > 0) {
          slowFrames -= 1;
        }
      }
    };

    const stop = (): void => {
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const start = (): void => {
      if (frameId !== 0 || reduceMotion.matches || !onScreen) return;
      lastTime = performance.now();
      frameId = requestAnimationFrame(frame);
    };

    const render = (): void => {
      stop();
      if (reduceMotion.matches) {
        settle();
        solve(0, false);
        draw();
        return;
      }
      start();
    };

    /**
     * Cached so the scroll handler never touches layout. Reading
     * `scrollHeight` per scroll event forces a synchronous reflow, which is
     * the single worst thing you can do on a scroll listener.
     */
    const measureScrollRange = (): void => {
      scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    };

    const readScroll = (): void => {
      lastScrollAt = performance.now();
      scrollProgress = scrollRange > 0 ? clamp(window.scrollY / scrollRange, 0, 1) : 0;
      // With motion reduced there is no loop, so repaint on demand instead.
      if (reduceMotion.matches) draw();
    };

    const resize = (): void => {
      const rect = wrapper.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      if (nextWidth === width && nextHeight === height) return;

      width = nextWidth;
      height = nextHeight;
      const dprCap =
        width < TUNING.mobileBreakpoint ? TUNING.mobileDpr : TUNING.maxDpr;
      dpr = Math.min(window.devicePixelRatio || 1, dprCap);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      sceneCanvas.width = canvas.width;
      sceneCanvas.height = canvas.height;
      bloomCanvas.width = Math.max(1, Math.round(canvas.width * TUNING.bloomScale));
      bloomCanvas.height = Math.max(1, Math.round(canvas.height * TUNING.bloomScale));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      plant();
      bakeBackdrops();
      measureScrollRange();
      solve(0, false);
      render();
    };

    const replant = (): void => {
      seed = (seed + 0x9e3779b9) >>> 0;
      plant();
      solve(0, false);
      render();
    };

    const onPointerDown = (event: PointerEvent): void => {
      // The layer is pointer-events:none, so this listens on the window. Clicks
      // on interactive elements or inside the content column are left alone.
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          "a, button, input, textarea, select, summary, [role='button'], [tabindex], [data-tree-ignore]",
        )
      ) {
        return;
      }
      replant();
    };

    /**
     * Geometric fallback. A fixed, full-viewport layer can have its first
     * IntersectionObserver callback report not-intersecting, and because its
     * intersection state never changes afterwards no second callback arrives —
     * which would leave the loop stopped forever.
     */
    const isOnScreen = (): boolean => {
      const rect = wrapper.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
      );
    };

    const onVisibility = (): void => {
      if (document.hidden) {
        stop();
        return;
      }
      onScreen = isOnScreen();
      start();
    };

    const onMotionChange = (): void => {
      render();
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(wrapper);

    // The document grows and shrinks independently of the viewport, so the
    // cached scroll range is refreshed from an observer rather than on scroll.
    const bodyObserver = new ResizeObserver(() => measureScrollRange());
    bodyObserver.observe(document.body);

    const intersectionObserver = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting) || isOnScreen();
      if (onScreen) start();
      else stop();
    });
    intersectionObserver.observe(wrapper);

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener(TREE_SURGE_EVENT, surge);
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", onMotionChange);

    // resize() measures the scroll range, so it has to run first.
    resize();
    readScroll();

    return () => {
      stop();
      resizeObserver.disconnect();
      bodyObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener(TREE_SURGE_EVENT, surge);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", onMotionChange);
    };
  }, [density, speed, colors]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none fixed inset-0 z-0"}
      style={{ backgroundColor: bg }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
