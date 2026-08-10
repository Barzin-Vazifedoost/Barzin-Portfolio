"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  TREE_ILLUMINATE_EVENT,
  TREE_SURGE_EVENT,
  type IlluminateDetail,
} from "@/lib/tree-events";
import { MOBILE_BREAKPOINT, STRUCTURE, buildTree, type TreeTopology } from "@/lib/tree/build";
import { graftContent, type Graft, type GraftEntry } from "@/lib/tree/graft";
import { GROWTH_TREE_PALETTE, type GrowthTreePalette } from "@/lib/tree/palette";
import {
  MOTION,
  branchControl,
  createSimulation,
  pointOnBranch,
  type Simulation,
} from "@/lib/tree/simulate";
import { createSeparation, solveSeparation, type Separation } from "@/lib/tree/split";
import { clamp, easeOut } from "@/lib/tree/math";

/**
 * The renderer for the growth tree: a hybrid organic-tree / data-graph
 * background where branches are edges, junctions and tips are nodes, and the
 * structure unfurls from a seed near the bottom.
 *
 * This file owns pixels and nothing else. The shape comes from
 * `lib/tree/build.ts`, the motion from `lib/tree/simulate.ts` and the mapping
 * from content to branches from `lib/tree/graft.ts` — all pure, all runnable
 * without a canvas.
 *
 * It is mounted once in the root layout and never unmounts, so a route change
 * moves the camera instead of tearing the scene down. That is why the palette,
 * the entries and the focused slug are read through refs: changing where you
 * are must never replant the tree.
 */

/**
 * Used when no seed is supplied. A constant rather than `Math.random()`: the
 * tree's shape is the site's identity, so even an unseeded tree should be the
 * same tree every time.
 */
export const DEFAULT_TREE_SEED = 0x5eed1a3f;

/** Stable identity, so the default never re-runs the effect. */
const NO_ENTRIES: readonly GraftEntry[] = [];

/** Everything about how the scene is painted, as opposed to what it is. */
const RENDER = {
  // ── Scroll ───────────────────────────────────────────────────────────────
  /** Pixels the whole scene drifts down as you scroll top → bottom. */
  cameraDrift: 300,
  /** Extra drift applied to the deepest layer, for parallax volume. */
  parallaxDepth: 190,

  // ── Focus camera ─────────────────────────────────────────────────────────
  /** Where on screen the focused node is asked to sit, as a fraction of the
   *  viewport. Right of centre and above the middle: clear of the text. */
  focusX: 0.66,
  focusY: 0.42,
  /** Hard cap on the pan, as a fraction of the viewport. The tree must never
   *  be able to leave the frame, however far out the focused node sits. */
  panLimit: 0.22,
  /** Exponential approach rate. Higher settles faster. */
  cameraEase: 2.6,
  /** Radius of a node carrying content, of a hovered one, and of the focused one. */
  anchorRadius: 3.2,
  litRadius: 4.3,
  focusRadius: 5.4,

  // ── Separation ───────────────────────────────────────────────────────────
  /** How much of each branch's bend is straightened out at full separation.
   *  A tree bends; a diagram does not. */
  splitStraighten: 0.85,

  // ── Canopy veil ──────────────────────────────────────────────────────────
  /** As you climb, drifting mist rolls up through the canopy and the tree
   *  dissolves behind it into a field of spores. All driven by scroll. */
  /** How far the tree fades out by the bottom of the page. Lower than it was:
   *  the tree now comes apart as you scroll, and dissolving it to near nothing
   *  meant you never got to see that happen. */
  veilTreeFade: 0.42,
  /** Peak opacity of a single mist blob. */
  veilStrength: 0.62,
  veilBlobs: 7,
  /** The blobs are composited into a quarter-scale buffer and blitted up once.
   *  Blending them straight onto the canvas meant seven screen-sized alpha
   *  blends per frame — invisible on a GPU that accelerates it, and the single
   *  biggest cost on the page everywhere else. Because it engages only once
   *  `scrollProgress` leaves zero, it showed up precisely as "the frame rate
   *  collapses when I scroll". Mist is a soft gradient, so rendering it small
   *  loses nothing. */
  veilScale: 0.25,
  /** Blob radius as a fraction of the viewport's smaller axis. */
  veilBlobRadius: 0.62,
  veilDriftSpeed: 0.07,
  /** Spores brighten and swell as the tree recedes, so something takes over. */
  veilSporeGain: 1.6,
  veilSporeSwell: 0.6,

  // ── Render ───────────────────────────────────────────────────────────────
  /** Bloom buffer scale and blur radius, in buffer pixels.
   *
   *  These three numbers decide whether the tree reads sharp or out of focus. A
   *  low-resolution buffer with a wide blur, composited back at near-full
   *  strength, means most of the visible light is a smeared upscale and no
   *  stroke appears to have an edge. A higher-resolution buffer with a tight
   *  blur at moderate strength keeps the halo hugging the geometry, which is
   *  what "glowing" should look like. */
  bloomScale: 0.5,
  bloomBlur: 4,
  bloomStrength: 0.5,
  /** Shadow radius for the small bright passes. Only applied when bloom is
   *  off: stacking a shadow underneath the bloom blurs the same pixels twice. */
  glowBlur: 9,
  vignetteStrength: 0.58,
  groundGlowRadius: 0.55,
  /** Backdrop gradients are baked once at this scale, then upscaled. The bake
   *  happens on resize only and the per-frame cost is a blit either way, so
   *  this is set for fidelity (low values band visibly) rather than speed. */
  backdropScale: 0.75,

  /** A hard, bright centre line drawn inside each branch, as a fraction of the
   *  branch's own width. A crisp core inside a soft glow is what makes a
   *  luminous line read as sharp instead of smeared — without it, the widest
   *  strokes are all halo and no filament. */
  filamentRatio: 0.34,
  filamentMinWidth: 0.75,

  // ── Performance ──────────────────────────────────────────────────────────
  /** Render cap. Sub-60 judder on a continuously moving canvas reads as motion
   *  blur, so this is deliberately at refresh rate; the adaptive degrade below
   *  is what protects slower devices. */
  targetFps: 60,
  /** Reduced cap while the user is actively scrolling: the main thread is busy
   *  with the DOM then, and the tree is not what is being looked at. */
  scrollFps: 20,
  /** How long after the last scroll event to keep using `scrollFps`. */
  scrollQuietMs: 180,
  /** A frame slower than this counts against the quality budget. */
  slowFrameMs: 20,
  /** Slow frames before quality is stepped down. One-way, two stages: the
   *  bloom buffer is halved first, and only then dropped entirely. */
  slowFrameLimit: 40,

  // ── Budgets ──────────────────────────────────────────────────────────────
  /** Full device pixels. Anything below the display's own ratio makes the
   *  browser upsample every stroke, which is the most visible source of
   *  softness there is — no amount of bloom tuning recovers from it. */
  maxDpr: 2,
  mobileDpr: 1.5,

  // ── Interaction ──────────────────────────────────────────────────────────
  /** Strength of the gust a click sends through the canopy. */
  clickGust: 1,
} as const;

export type GrowthTreeProps = {
  /** Scales branch budget and particle counts. 1 = default. Clamped to 0.4–2. */
  density?: number;
  /** Growth and pulse rate multiplier. 1 = default. Clamped to 0.25–3. */
  speed?: number;
  /**
   * Decides the shape. Pass a hash of what has been published — see `hashSeed`
   * in `lib/tree/math.ts` — so the canopy is a function of the work rather
   * than of chance.
   */
  seed?: number;
  /** Published entries to graft onto branches. Changing these regrows the tree. */
  entries?: readonly GraftEntry[];
  /** Slug of the entry being viewed. Lights its path and moves the camera. */
  focusSlug?: string | null;
  /** Partial palette override; unset keys fall back to `GROWTH_TREE_PALETTE`. */
  palette?: Partial<GrowthTreePalette>;
  /** Replaces the default fixed full-viewport positioning. */
  className?: string;
};

type Rgb = { r: number; g: number; b: number };
type Palette = { bg: Rgb; deep: Rgb; mid: Rgb; neon: Rgb; core: Rgb };

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

export default function GrowthTree({
  density = 1,
  speed = 1,
  seed = DEFAULT_TREE_SEED,
  entries = NO_ENTRIES,
  focusSlug = null,
  palette,
  className,
}: GrowthTreeProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Depend on the resolved strings rather than object identity, so callers can
  // pass an inline palette literal without rebuilding anything.
  const { bg, deep, mid, neon, core } = { ...GROWTH_TREE_PALETTE, ...palette };
  const colors = useMemo<Palette>(
    () => ({
      bg: hexToRgb(bg),
      deep: hexToRgb(deep),
      mid: hexToRgb(mid),
      neon: hexToRgb(neon),
      core: hexToRgb(core),
    }),
    [bg, deep, mid, neon, core],
  );

  /**
   * Read through refs so a route change never re-runs the effect. Navigating
   * shifts the light and moves the camera; it must not replant the tree.
   */
  const colorsRef = useRef(colors);
  const focusRef = useRef(focusSlug);
  const entriesRef = useRef(entries);

  // Refs are written here rather than during render — the render pass must stay
  // free of side effects. Declared before the canvas effect so the values are
  // already current the first time it runs. The loop picks them up on its next
  // frame, which is a repaint away.
  useEffect(() => {
    colorsRef.current = colors;
    focusRef.current = focusSlug;
    entriesRef.current = entries;
  });

  // Regrowing is only correct when the content itself changed, so the effect
  // depends on a stable description of the entries rather than the array.
  const entriesKey = useMemo(
    () => entries.map((entry) => `${entry.kind}:${entry.slug}`).join("|"),
    [entries],
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
    // The mist blobs are blended together here, at a fraction of the scale,
    // then blitted up once — see `veilScale`.
    const veilCanvas = document.createElement("canvas");
    const veilCtx = veilCanvas.getContext("2d");
    if (!sceneCtx || !bloomCtx || !glowCtx || !vignetteCtx || !mistCtx || !veilCtx) return;

    /** Turned off permanently if the device cannot keep up. */
    let bloomOn = typeof sceneCtx.filter === "string";
    /** Multiplier on `bloomScale`, stepped down before bloom is dropped. */
    let bloomQuality = 1;
    let slowFrames = 0;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let width = 0;
    let height = 0;
    let dpr = 1;
    /** Drives both the DPR cap and the bloom skip — see `draw`. */
    let isMobile = false;
    let topology: TreeTopology | null = null;
    let sim: Simulation | null = null;
    let graft: Graft | null = null;
    let trunkGradient: CanvasGradient | null = null;
    let scrollProgress = 0;
    let scrollRange = 0;
    let pending = 0;
    let lastScrollAt = 0;
    let frameId = 0;
    let lastTime = 0;
    let onScreen = true;

    /** The palette the gradient and backdrops were last baked with. */
    let bakedColors: Palette | null = null;

    // Focus camera. Pan only — no zoom, so the baked backdrops stay valid.
    let focusIndex = -1;
    let panX = 0;
    let panY = 0;
    let panTargetX = 0;
    let panTargetY = 0;

    /**
     * Slug being hovered anywhere on the page. It lights a path but never moves
     * the camera — a canopy that lurched every time the pointer crossed a link
     * would be unusable.
     */
    let hoverSlug: string | null = null;
    let litIndex = -1;

    // Scroll-driven separation. Rewritten in place, only when scroll moved.
    let separation: Separation = createSeparation(0);
    let separationScroll = Number.NaN;

    /**
     * Height-based colour ramp: emerald at the roots, mint at the tips. Applied
     * as a gradient on the stroke so it survives per-depth batching.
     */
    const buildGradient = (tree: TreeTopology, paint: Palette): void => {
      const reach = (tree.rootLength / (1 - STRUCTURE.lengthFalloff)) * 0.85;
      const gradient = ctx.createLinearGradient(
        0,
        tree.rootY,
        0,
        Math.max(0, tree.rootY - reach),
      );
      gradient.addColorStop(0, rgba(paint.deep, 1));
      gradient.addColorStop(0.45, rgba(paint.mid, 1));
      gradient.addColorStop(0.85, rgba(paint.core, 1));
      gradient.addColorStop(1, rgba(paint.core, 1));
      trunkGradient = gradient;
    };

    /** Grows a fresh tree for the current viewport. Same seed, same shape. */
    const plant = (): void => {
      topology = buildTree({ width, height, seed, density });
      sim = createSimulation(topology, { speed, seed });
      graft = graftContent(topology, entriesRef.current);
      separation = createSeparation(topology.branches.length);
      separationScroll = Number.NaN;
      // A replant invalidates the resolved indices — they are per-topology.
      focusIndex = -1;
      litIndex = -1;
    };

    /** Recomputes separation, but only when the scroll actually moved. */
    const syncSeparation = (): void => {
      if (!topology || separationScroll === scrollProgress) return;
      solveSeparation(topology, scrollProgress, separation);
      separationScroll = scrollProgress;
    };

    /**
     * Points the camera at the entry being viewed. Pan is clamped hard: the
     * canopy must stay in frame no matter how far out the node sits.
     */
    const retarget = (): void => {
      if (focusIndex === -1 || !topology) {
        panTargetX = 0;
        panTargetY = 0;
        return;
      }
      const branch = topology.branches[focusIndex];
      panTargetX = clamp(
        width * RENDER.focusX - branch.restX,
        -width * RENDER.panLimit,
        width * RENDER.panLimit,
      );
      panTargetY = clamp(
        height * RENDER.focusY - branch.restY,
        -height * RENDER.panLimit,
        height * RENDER.panLimit,
      );
    };

    const resolve = (slug: string | null): number =>
      slug && graft ? (graft.bySlug.get(slug) ?? -1) : -1;

    /**
     * Resolves what the canopy should be pointing at, once per frame. The route
     * drives the camera; a hovered link only takes over the lit path, so
     * pointing at a link previews where it goes without moving the scene.
     */
    const readFocus = (): void => {
      const next = resolve(focusRef.current);
      if (next !== focusIndex) {
        focusIndex = next;
        retarget();
      }
      const hovered = resolve(hoverSlug);
      litIndex = hovered !== -1 ? hovered : focusIndex;
    };

    /**
     * Draws the luminous half of the frame. `clear` is set when rendering into
     * the offscreen bloom buffer; the direct path paints over the backdrop.
     */
    const drawInto = (
      target: CanvasRenderingContext2D,
      clear: boolean,
      lite: boolean,
      bloomed: boolean,
    ): void => {
      if (!topology || !sim) return;
      const paint = colorsRef.current;
      const { byDepth, maxDepth } = topology;
      const { branches, pulses, spores, sparks, elapsed } = sim;

      target.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Cleared before the pan is applied, so the whole buffer is wiped rather
      // than a panned rectangle of it.
      if (clear) target.clearRect(0, 0, width, height);
      target.translate(panX, panY);
      target.globalCompositeOperation = "lighter";
      target.lineCap = "round";
      target.lineJoin = "round";

      const camera = scrollProgress * RENDER.cameraDrift;
      /** The tree recedes as the veil rolls in. Applied to branch-anchored
       *  passes only — the spores deliberately survive to carry the scene. */
      const treeAlpha = 1 - scrollProgress * RENDER.veilTreeFade;

      /**
       * Every branch's total displacement: its parallax by depth, plus the
       * scroll separation that pulls the tree apart at the joints. Each branch
       * moves rigidly by its own vector, which is exactly why the joints open —
       * the gap at a joint is the difference between a child's offset and its
       * parent's. No global translate anywhere below: siblings at one depth no
       * longer share an offset once the tree starts coming apart.
       */
      const offX = (branch: (typeof branches)[number]): number => separation.x[branch.index];
      const offY = (branch: (typeof branches)[number]): number =>
        separation.y[branch.index] +
        camera +
        scrollProgress * RENDER.parallaxDepth * (branch.depth / Math.max(1, maxDepth));

      // A tree bends; a diagram does not. The bend relaxes out as it separates.
      const curveScale = 1 - separation.progress * RENDER.splitStraighten;


      // Edges, still one batched path per depth — the offsets are baked into
      // the coordinates rather than applied as a transform, so the batching
      // survives separation. Each depth is stroked twice from that single path:
      // once wide for the body, once narrow for the filament down its centre.
      for (let depth = 0; depth < byDepth.length; depth += 1) {
        const indices = byDepth[depth];
        if (!indices || indices.length === 0) continue;

        const depthT = depth / Math.max(1, maxDepth);
        const bodyWidth = Math.max(
          0.8,
          STRUCTURE.rootWidth * Math.pow(STRUCTURE.widthFalloff, depth),
        );

        target.shadowBlur = 0;

        target.beginPath();
        for (const index of indices) {
          const branch = branches[index];
          if (!branch.active || branch.progress <= 0) continue;
          const ox = offX(branch);
          const oy = offY(branch);
          const { cx, cy } = branchControl(branch, curveScale);
          target.moveTo(branch.ax + ox, branch.ay + oy);
          target.quadraticCurveTo(cx + ox, cy + oy, branch.bx + ox, branch.by + oy);
        }

        target.strokeStyle = trunkGradient ?? rgba(paint.mid, 1);
        // Atmospheric dimming: distance into the canopy fades out. Shallower
        // than a straight falloff, so far branches stay defined lines rather
        // than dissolving into grey haze.
        target.globalAlpha = (0.95 - 0.3 * depthT) * treeAlpha;
        target.lineWidth = bodyWidth;
        target.stroke();

        // The filament. Same path, so it is exactly centred; skipped once the
        // body is thin enough to be its own core, and while scrolling, where a
        // second full stroke pass buys sharpness nobody can see.
        if (bodyWidth > 1.4 && !lite) {
          target.strokeStyle = rgba(paint.core, 1);
          target.globalAlpha = (0.5 - 0.24 * depthT) * treeAlpha;
          target.lineWidth = Math.max(
            RENDER.filamentMinWidth,
            bodyWidth * RENDER.filamentRatio,
          );
          target.stroke();
        }
      }

      // The path from the root to whatever you are reading — or to the link
      // under the pointer. Each branch has its own width, so they cannot share
      // one path.
      if (litIndex !== -1) {
        target.globalAlpha = treeAlpha;
        target.strokeStyle = rgba(paint.neon, 0.9);
        target.shadowBlur = bloomed ? 0 : RENDER.glowBlur * 1.6;
        target.shadowColor = rgba(paint.neon, 1);
        for (let i = litIndex; i !== -1; i = branches[i].parent) {
          const branch = branches[i];
          if (!branch.active || branch.progress <= 0) continue;
          const ox = offX(branch);
          const oy = offY(branch);
          const { cx, cy } = branchControl(branch, curveScale);
          target.lineWidth = Math.max(1.2, branch.width * 0.85);
          target.beginPath();
          target.moveTo(branch.ax + ox, branch.ay + oy);
          target.quadraticCurveTo(cx + ox, cy + oy, branch.bx + ox, branch.by + oy);
          target.stroke();
        }
        target.shadowBlur = 0;
      }

      // Bright leading edge of everything still growing. No global translate:
      // each head carries its own branch's parallax so it stays welded on.
      target.globalAlpha = treeAlpha;
      target.strokeStyle = rgba(paint.neon, 0.85);
      target.lineWidth = 1.5;
      target.shadowBlur = bloomed ? 0 : RENDER.glowBlur * 1.4;
      target.shadowColor = rgba(paint.neon, 0.9);
      target.beginPath();
      for (const branch of branches) {
        if (!branch.active || branch.progress <= 0 || branch.progress >= 1) continue;
        const eased = easeOut(branch.progress);
        const back = Math.max(0, eased - 0.14) / Math.max(0.0001, eased);
        const ox = offX(branch);
        const oy = offY(branch);
        const from = pointOnBranch(branch, back, curveScale);
        target.moveTo(from.x + ox, from.y + oy);
        target.lineTo(branch.bx + ox, branch.by + oy);
      }
      target.stroke();

      // Nodes, batched per depth. Tips breathe; buds glow brighter.
      for (let depth = 0; depth < byDepth.length; depth += 1) {
        const indices = byDepth[depth];
        if (!indices || indices.length === 0) continue;

        const depthT = depth / Math.max(1, maxDepth);

        target.fillStyle = rgba(paint.core, 1);
        target.globalAlpha = (0.95 - 0.45 * depthT) * treeAlpha;
        target.shadowBlur = 0;

        target.beginPath();
        for (const index of indices) {
          const branch = branches[index];
          if (!branch.active || branch.progress < 0.98) continue;
          const breath = branch.isTip
            ? 1 +
              Math.sin(elapsed * MOTION.breathSpeed + branch.breathOffset) *
                MOTION.breathAmount
            : 1;
          // Floor above 1px: a sub-pixel additive circle is a grey smudge, not
          // a dot, which is what made the deepest nodes look like dirt.
          const radius = Math.max(1.15, branch.width * 0.62) * breath;
          const x = branch.bx + offX(branch);
          const y = branch.by + offY(branch);
          target.moveTo(x + radius, y);
          target.arc(x, y, radius, 0, Math.PI * 2);
        }
        target.fill();
      }

      // Branches that are actually something you published, drawn heavier than
      // the filler around them. This is what makes the canopy read as content
      // rather than as decoration.
      if (graft && graft.anchors.length > 0) {
        target.globalAlpha = treeAlpha;
        target.fillStyle = rgba(paint.core, 1);
        target.shadowBlur = bloomed ? 0 : RENDER.glowBlur;
        target.shadowColor = rgba(paint.neon, 0.9);
        target.beginPath();
        for (const index of graft.anchors) {
          const branch = branches[index];
          if (!branch || !branch.active || branch.progress < 0.98) continue;
          const breath =
            1 +
            Math.sin(elapsed * MOTION.breathSpeed + branch.breathOffset) * MOTION.breathAmount;
          const base =
            index === focusIndex
              ? RENDER.focusRadius
              : index === litIndex
                ? RENDER.litRadius
                : RENDER.anchorRadius;
          const radius = base * breath;
          const x = branch.bx + offX(branch);
          const y = branch.by + offY(branch);
          target.moveTo(x + radius, y);
          target.arc(x, y, radius, 0, Math.PI * 2);
        }
        target.fill();
        target.shadowBlur = 0;
      }

      // Data pulses ride the branch's rendered curve and pick up the same
      // per-depth parallax as the edge they travel along. Interpolating the
      // chord instead is what made them drift off the branch.
      if (pulses.length > 0) {
        target.globalAlpha = treeAlpha;
        target.fillStyle = rgba(paint.core, 0.95);
        target.shadowBlur = bloomed ? 0 : RENDER.glowBlur * 1.5;
        target.shadowColor = rgba(paint.neon, 1);
        target.beginPath();
        for (const pulse of pulses) {
          const branch = branches[pulse.branch];
          if (!branch) continue;
          const point = pointOnBranch(branch, Math.min(1, pulse.t), curveScale);
          const x = point.x + offX(branch);
          const y = point.y + offY(branch);
          const radius = 2.2 * pulse.bright;
          target.moveTo(x + radius, y);
          target.arc(x, y, radius, 0, Math.PI * 2);
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
      const sporeGain = 1 + scrollProgress * RENDER.veilSporeGain;
      const sporeSwell = 1 + scrollProgress * RENDER.veilSporeSwell;
      for (let tier = 0; tier < 3; tier += 1) {
        target.fillStyle = rgba(paint.mid, Math.min(1, (0.18 + tier * 0.14) * sporeGain));
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
          target.fillStyle = rgba(paint.neon, 0.15 + tier * 0.2);
          target.beginPath();
          for (let i = tier; i < sparks.length; i += 3) {
            const spark = sparks[i];
            const radius = 1.4 * (spark.life / MOTION.sparkLifeSeconds);
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
     * Sizes the bloom buffer from the canvas and the current quality step.
     * Called on resize and whenever the degrade lowers `bloomQuality`.
     */
    const sizeBloom = (): void => {
      const scale = RENDER.bloomScale * bloomQuality;
      bloomCanvas.width = Math.max(1, Math.round(canvas.width * scale));
      bloomCanvas.height = Math.max(1, Math.round(canvas.height * scale));
    };

    /**
     * Bakes the ground glow and vignette once per resize — and once per palette
     * change, since the glow is tinted. Both are smooth radial gradients over
     * the full viewport; evaluating them per pixel every frame was two of the
     * most expensive operations in the loop.
     */
    const bakeBackdrops = (paint: Palette): void => {
      if (!topology) return;
      const bw = Math.max(1, Math.round(width * RENDER.backdropScale));
      const bh = Math.max(1, Math.round(height * RENDER.backdropScale));
      const scale = RENDER.backdropScale;

      glowCanvas.width = bw;
      glowCanvas.height = bh;
      glowCtx.clearRect(0, 0, bw, bh);
      const glowRadius = Math.min(width, height) * RENDER.groundGlowRadius * scale;
      const glow = glowCtx.createRadialGradient(
        topology.rootX * scale,
        topology.rootY * scale,
        0,
        topology.rootX * scale,
        topology.rootY * scale,
        glowRadius,
      );
      glow.addColorStop(0, rgba(paint.deep, 0.55));
      glow.addColorStop(0.5, rgba(paint.deep, 0.16));
      glow.addColorStop(1, rgba(paint.deep, 0));
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
      vignette.addColorStop(1, `rgba(0, 0, 0, ${RENDER.vignetteStrength})`);
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

    /** Re-bakes anything tinted when the route shifts the light. */
    const syncPalette = (): void => {
      const paint = colorsRef.current;
      if (paint === bakedColors || !topology) return;
      bakedColors = paint;
      buildGradient(topology, paint);
      bakeBackdrops(paint);
    };

    /**
     * Drifting mist that rolls up through the canopy as you scroll.
     *
     * The blobs are composited into a quarter-scale buffer and blitted up once.
     * Blending them straight onto the canvas meant seven screen-sized alpha
     * blends per frame — invisible on a GPU that accelerates it, and the single
     * biggest cost on the page everywhere else. Because it engages only once
     * `scrollProgress` leaves zero, it showed up precisely as "the frame rate
     * collapses when I scroll".
     */
    const drawVeil = (): void => {
      if (!sim || scrollProgress <= 0.002) return;
      const radius = Math.min(width, height) * RENDER.veilBlobRadius;
      const elapsed = sim.elapsed;

      // The buffer is scaled so blob positions can stay in CSS pixels.
      veilCtx.setTransform(dpr * RENDER.veilScale, 0, 0, dpr * RENDER.veilScale, 0, 0);
      veilCtx.clearRect(0, 0, width, height);
      veilCtx.globalCompositeOperation = "source-over";

      for (let i = 0; i < RENDER.veilBlobs; i += 1) {
        const phase = i * 1.7;
        const x =
          width * (0.12 + 0.78 * ((i + 0.5) / RENDER.veilBlobs)) +
          Math.sin(elapsed * RENDER.veilDriftSpeed + phase) * width * 0.07;
        // Sits below the fold at rest and climbs into frame with scroll.
        const y =
          height * (1.15 - 0.85 * scrollProgress) +
          Math.cos(elapsed * RENDER.veilDriftSpeed * 0.8 + phase) * height * 0.05 +
          ((i % 3) - 1) * height * 0.16;
        veilCtx.globalAlpha =
          scrollProgress * RENDER.veilStrength * (0.5 + 0.5 * Math.abs(Math.sin(phase)));
        veilCtx.drawImage(mistCanvas, x - radius, y - radius, radius * 2, radius * 2);
      }

      veilCtx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(veilCanvas, 0, 0, width, height);
    };

    const draw = (lite: boolean): void => {
      const paint = colorsRef.current;
      // Every path below reads separation, so it is refreshed here rather than
      // in the loop — the reduced-motion path repaints without a loop at all.
      syncSeparation();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgba(paint.bg, 1);
      ctx.fillRect(0, 0, width, height);

      // The ground glow is part of the scene, so it takes the camera pan as
      // well as the scroll offset. The vignette and the veil deliberately do
      // not — they are lens and atmosphere, not geometry.
      const camera = scrollProgress * RENDER.cameraDrift;
      ctx.drawImage(glowCanvas, panX, camera + panY, width, height);

      /**
       * Whether a real bloom pass runs over this frame. Bloom costs three
       * screen-sized passes — the scene blit, the blurred downscale and the
       * additive composite — so it is dropped in three cases:
       *
       * - while scrolling, where the halo changes against a moving page and
       *   nobody can see it;
       * - on mobile, where the scrim covers the canopy almost entirely and the
       *   three passes buy nothing at all;
       * - permanently, once the adaptive degrade has given up on the device.
       *
       * The small bright passes carry a shadow that stands in for bloom, so
       * this value is handed to `drawInto` rather than recomputed there —
       * a frame that skips bloom must pick the shadow back up, and one that
       * runs it must not, since stacking both blurs the same pixels twice.
       */
      const bloomed = bloomOn && !lite && !isMobile;

      if (bloomed) {
        // Render once into the scene buffer, then composite it twice: straight
        // at 1:1 for the sharp image, then blurred and additive for the halo.
        drawInto(sceneCtx, true, lite, bloomed);
        ctx.drawImage(sceneCanvas, 0, 0, width, height);

        bloomCtx.setTransform(1, 0, 0, 1, 0, 0);
        bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
        bloomCtx.filter = `blur(${RENDER.bloomBlur}px)`;
        bloomCtx.drawImage(sceneCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height);
        bloomCtx.filter = "none";

        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = RENDER.bloomStrength;
        ctx.drawImage(bloomCanvas, 0, 0, width, height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      } else {
        // No bloom: skip the offscreen buffer entirely and draw straight to the
        // visible canvas, which saves a full-resolution blit per frame.
        drawInto(ctx, false, lite, bloomed);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }

      drawVeil();
      ctx.drawImage(vignetteCanvas, 0, 0, width, height);
    };

    const frame = (now: number): void => {
      frameId = requestAnimationFrame(frame);
      if (!sim) return;
      // Clamp so a backgrounded tab does not resume with one enormous delta.
      const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
      lastTime = now;
      pending += dt;

      // Cap the render rate, and back off further while scrolling so the main
      // thread is free for the DOM. Simulation time still accumulates
      // accurately, so growth and wind run at the same speed — fewer frames.
      const scrolling = now - lastScrollAt < RENDER.scrollQuietMs;
      const frameInterval = 1 / (scrolling ? RENDER.scrollFps : RENDER.targetFps);
      if (pending < frameInterval) return;

      const started = performance.now();
      syncPalette();
      readFocus();
      // Exponential approach, framerate-independent, so the capped and
      // scroll-throttled rates all settle over the same wall-clock time.
      const k = 1 - Math.exp(-pending * RENDER.cameraEase);
      panX += (panTargetX - panX) * k;
      panY += (panTargetY - panY) * k;

      sim.step(pending);
      sim.solve(sim.elapsed, true);
      draw(scrolling);
      pending = 0;

      // One-way quality degrade, in two stages: halve the bloom buffer first,
      // and only drop the glow entirely if that still isn't enough. Sharpness
      // is never traded away here — the full-resolution scene pass stays.
      //
      // Scroll and mobile frames are excluded: both already skip bloom, so
      // timing them would measure a cheaper frame than the one being judged.
      if (bloomOn && !scrolling && !isMobile) {
        if (performance.now() - started > RENDER.slowFrameMs) {
          slowFrames += 1;
          if (slowFrames > RENDER.slowFrameLimit) {
            if (bloomQuality > 0.5) {
              bloomQuality = 0.5;
              sizeBloom();
              slowFrames = 0;
            } else {
              bloomOn = false;
            }
          }
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
      if (!sim) return;
      if (reduceMotion.matches) {
        // No loop to ease anything, so the camera snaps and the tree is drawn
        // already grown. One frame, no motion.
        syncPalette();
        readFocus();
        panX = panTargetX;
        panY = panTargetY;
        sim.settle();
        sim.solve(0, false);
        draw(false);
        return;
      }
      start();
    };

    /**
     * Cached so the scroll handler never touches layout. Reading `scrollHeight`
     * per scroll event forces a synchronous reflow, which is the single worst
     * thing you can do on a scroll listener.
     */
    const measureScrollRange = (): void => {
      scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    };

    const readScroll = (): void => {
      lastScrollAt = performance.now();
      scrollProgress = scrollRange > 0 ? clamp(window.scrollY / scrollRange, 0, 1) : 0;
      // With motion reduced there is no loop, so repaint on demand instead.
      if (reduceMotion.matches) draw(false);
    };

    const resize = (): void => {
      const rect = wrapper.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      if (nextWidth === width && nextHeight === height) return;

      width = nextWidth;
      height = nextHeight;
      isMobile = width < MOBILE_BREAKPOINT;
      const dprCap = isMobile ? RENDER.mobileDpr : RENDER.maxDpr;
      dpr = Math.min(window.devicePixelRatio || 1, dprCap);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      sceneCanvas.width = canvas.width;
      sceneCanvas.height = canvas.height;
      sizeBloom();
      veilCanvas.width = Math.max(1, Math.round(canvas.width * RENDER.veilScale));
      veilCanvas.height = Math.max(1, Math.round(canvas.height * RENDER.veilScale));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      plant();
      // A new topology means the old bake is stale whatever the palette is.
      bakedColors = null;
      syncPalette();
      measureScrollRange();
      readFocus();
      panX = panTargetX;
      panY = panTargetY;
      sim?.solve(0, false);
      render();
    };

    const onSurge = (): void => {
      sim?.surge();
    };

    /**
     * Any internal link, anywhere, previewing where it goes. Lights the path
     * only — the camera stays where the route put it, because a scene that
     * lurched whenever the pointer crossed a link would be unusable.
     */
    const onIlluminate = (event: Event): void => {
      const detail = (event as CustomEvent<IlluminateDetail>).detail;
      const next = detail?.slug ?? null;
      if (next === hoverSlug) return;
      hoverSlug = next;
      // No loop under reduced motion, so repaint on demand.
      if (reduceMotion.matches) {
        readFocus();
        draw(false);
      }
    };

    /**
     * A click shakes the canopy. It used to replant the tree from a fresh
     * random seed — but a deterministic shape is the point of the content-
     * derived tree, so the interaction became a gust instead: same tree,
     * disturbed air, blowing away from wherever you clicked.
     */
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
      if (!sim || !topology) return;
      const direction = event.clientX < topology.rootX ? 1 : -1;
      sim.gust(RENDER.clickGust * direction);
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
    // It also fires on every navigation, which is what keeps the range honest
    // now that the canvas outlives the page under it.
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
    window.addEventListener(TREE_SURGE_EVENT, onSurge);
    window.addEventListener(TREE_ILLUMINATE_EVENT, onIlluminate);
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
      window.removeEventListener(TREE_SURGE_EVENT, onSurge);
      window.removeEventListener(TREE_ILLUMINATE_EVENT, onIlluminate);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", onMotionChange);
    };
  }, [density, speed, seed, entriesKey]);

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
