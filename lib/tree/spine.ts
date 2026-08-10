/**
 * Branch geometry for the page itself.
 *
 * The canvas grows a tree behind the site; this grows one *in* it. Every index,
 * every list, every run of roles on the resume hangs off a tapering bough with
 * real twigs curving out to each node — instead of the straight rule and round
 * dot that reads as a timeline no matter what colour you paint it.
 *
 * Pure and deterministic: a twig's bend comes from its position in the list, so
 * the same page always draws the same branch, on the server, with no
 * measurement and no JavaScript.
 */

export const SPINE = {
  /** Bough box, in its own user units. Height is scaled to the list. */
  boughWidth: 12,
  boughHeight: 100,
  /** Trunk width where the list starts, and where it ends. */
  boughTop: 7,
  boughBottom: 2.2,
  /** Twig box, in CSS pixels — rendered at its natural size. */
  twigWidth: 30,
  twigHeight: 60,
  /** Where the node sits on the twig, as a fraction of the box height. */
  twigNodeY: 0.34,
  /** Stroke at the first twig, and at the last one. Thick near the base. */
  twigStrokeNear: 2.1,
  twigStrokeFar: 1,
  /** How far a twig's exit point can wander, in box heights. */
  twigWander: 0.22,
} as const;

/**
 * The bough: a tapering vertical trunk. Drawn as a filled shape rather than a
 * stroke, because a stroke cannot taper. Rendered with
 * `preserveAspectRatio="none"` so it stretches to whatever the list's height
 * turns out to be while its width stays honest.
 */
export function boughPath(flip = false): string {
  const { boughWidth: w, boughHeight: h, boughTop, boughBottom } = SPINE;
  const cx = w / 2;
  // Roots widen as they descend; branches narrow. Same shape, turned over.
  const top = flip ? boughBottom : boughTop;
  const bottom = flip ? boughTop : boughBottom;
  const midBend = w * 0.16;

  const leftTop = cx - top / 2;
  const leftBottom = cx - bottom / 2;
  const rightBottom = cx + bottom / 2;
  const rightTop = cx + top / 2;

  // A gentle S down each side, so the trunk is never a straight wedge.
  return [
    `M ${leftTop} 0`,
    `C ${leftTop - midBend} ${h * 0.34}, ${leftBottom + midBend} ${h * 0.68}, ${leftBottom} ${h}`,
    `L ${rightBottom} ${h}`,
    `C ${rightBottom + midBend} ${h * 0.68}, ${rightTop - midBend} ${h * 0.34}, ${rightTop} 0`,
    "Z",
  ].join(" ");
}

/** Deterministic 0–1 from an index. Cheap, and stable across renders. */
function jitter(index: number, salt: number): number {
  const n = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export type Twig = {
  /** Path from the bough out to the node. */
  d: string;
  nodeX: number;
  nodeY: number;
  width: number;
  height: number;
  strokeWidth: number;
};

/**
 * One twig: leaves the bough low and curves up and out to its node, the way a
 * real branch leaves a trunk. `total` tapers the stroke so twigs near the top
 * of a list — nearer the base of the tree — are visibly heavier.
 */
export function twigPath(index: number, total: number, flip = false): Twig {
  const { twigWidth: w, twigHeight: h, twigNodeY, twigWander } = SPINE;

  const t = total <= 1 ? 0 : index / (total - 1);
  const strokeWidth =
    SPINE.twigStrokeNear + (SPINE.twigStrokeFar - SPINE.twigStrokeNear) * t;

  // Where it meets the node, and how hard it bends getting there.
  const wander = (jitter(index, 1) - 0.5) * 2 * twigWander;
  const nodeY = h * (twigNodeY + wander);
  const bend = 0.4 + jitter(index, 2) * 0.35;

  // Enters at the bough (x = 0) low in the box, so the curve reads as a limb
  // leaving the trunk rather than a bracket.
  const startY = h * 0.94;
  const path = [
    `M 0 ${startY}`,
    `C ${w * bend} ${startY}, ${w * (1 - bend * 0.5)} ${nodeY + (startY - nodeY) * 0.35}, ${w} ${nodeY}`,
  ].join(" ");

  return {
    d: flip ? mirrorY(path, h) : path,
    nodeX: w,
    nodeY: flip ? h - nodeY : nodeY,
    width: w,
    height: h,
    strokeWidth,
  };
}

/**
 * Flips a path vertically inside its box. Roots leave the trunk going down, so
 * the same curve is reused upside down rather than written twice.
 */
function mirrorY(path: string, height: number): string {
  return path.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) =>
    `${x} ${(height - Number.parseFloat(y)).toFixed(3)}`,
  );
}
