import { buildTree } from "@/lib/tree/build";
import { branchControl, createSimulation } from "@/lib/tree/simulate";

/**
 * The tree as a static SVG.
 *
 * `lib/tree/*` is free of DOM and canvas precisely so the tree can be grown
 * somewhere there is no browser. This is that payoff: the same topology and the
 * same seed the canvas plants, settled to a fully grown state and emitted as
 * markup, so the social card and the favicon show *this* site's actual tree
 * rather than a drawing of one.
 *
 * Used at build time by `app/opengraph-image.tsx` and `app/icon.tsx`.
 */

export type TreeSvgOptions = {
  width: number;
  height: number;
  seed: number;
  /** Scales the branch budget. Lower reads better at small sizes. */
  density?: number;
  /** Trunk position across the frame, 0–1. Defaults to the topology's own. */
  rootXRatio?: number;
  palette: { deep: string; mid: string; core: string; neon: string };
  /** Drop branches past this depth. Detail below a few pixels turns to mud. */
  maxDepth?: number;
  /** Draw a glowing dot at every tip. Off for small sizes. */
  tips?: boolean;
  /**
   * Crop the viewBox to what was actually drawn, so the tree fills the frame.
   * `buildTree` lays out for a landscape viewport and roots the trunk near the
   * bottom, so a square frame otherwise gets a squat shape stranded low down.
   */
  fit?: boolean;
  /** Padding around a fitted box, as a fraction of its larger side. */
  fitPadding?: number;
};

/** Linear blend between two `#rrggbb` strings. */
function mix(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const ch = (shift: number): number => {
    const va = (pa >> shift) & 255;
    const vb = (pb >> shift) & 255;
    return Math.round(va + (vb - va) * t);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/**
 * Height ramp: emerald at the roots, mint at the tips. The canvas does this
 * with a gradient on the stroke; here it is resolved per depth, which keeps the
 * markup to plain paths and renders identically once rasterised.
 */
function depthColor(t: number, palette: TreeSvgOptions["palette"]): string {
  return t < 0.5
    ? mix(palette.deep, palette.mid, t / 0.5)
    : mix(palette.mid, palette.core, (t - 0.5) / 0.5);
}

export function renderTreeSvg({
  width,
  height,
  seed,
  density = 1,
  rootXRatio,
  palette,
  maxDepth,
  tips = true,
  fit = false,
  fitPadding = 0.06,
}: TreeSvgOptions): string {
  const topology = buildTree({ width, height, seed, density });
  const sim = createSimulation(topology, { seed });
  // Grow it all the way, then resolve endpoints with the wind switched off.
  sim.settle();
  sim.solve(0, false);

  const depthLimit = maxDepth ?? topology.maxDepth;
  // `buildTree` decides the trunk's x from the viewport; an override lets the
  // card place the canopy where the layout has room for it.
  const shiftX =
    rootXRatio === undefined ? 0 : width * rootXRatio - topology.rootX;

  const paths: string[] = [];
  const dots: string[] = [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const bound = (x: number, y: number, pad: number): void => {
    if (x - pad < minX) minX = x - pad;
    if (y - pad < minY) minY = y - pad;
    if (x + pad > maxX) maxX = x + pad;
    if (y + pad > maxY) maxY = y + pad;
  };

  for (const branch of sim.branches) {
    if (!branch.active || branch.progress <= 0 || branch.depth > depthLimit) continue;

    const { cx, cy } = branchControl(branch);
    const color = depthColor(branch.depth / Math.max(1, topology.maxDepth), palette);
    const strokeWidth = Math.max(0.6, branch.width);

    // Half the stroke, so the box holds the drawn edge rather than the centre.
    const half = strokeWidth / 2;
    bound(branch.ax + shiftX, branch.ay, half);
    bound(branch.bx + shiftX, branch.by, half);

    paths.push(
      `<path d="M${(branch.ax + shiftX).toFixed(1)} ${branch.ay.toFixed(1)}` +
        `Q${(cx + shiftX).toFixed(1)} ${cy.toFixed(1)} ` +
        `${(branch.bx + shiftX).toFixed(1)} ${branch.by.toFixed(1)}" ` +
        `stroke="${color}" stroke-width="${strokeWidth.toFixed(2)}" ` +
        `stroke-linecap="round" fill="none"/>`,
    );

    if (tips && branch.isTip) {
      dots.push(
        `<circle cx="${(branch.bx + shiftX).toFixed(1)}" cy="${branch.by.toFixed(1)}" ` +
          `r="${Math.max(1.4, branch.width * 0.8).toFixed(2)}" fill="${palette.core}"/>`,
      );
    }
  }

  let viewBox = `0 0 ${width} ${height}`;
  if (fit && Number.isFinite(minX)) {
    const boxW = maxX - minX;
    const boxH = maxY - minY;
    const pad = Math.max(boxW, boxH) * fitPadding;
    viewBox = `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(
      boxW +
      pad * 2
    ).toFixed(1)} ${(boxH + pad * 2).toFixed(1)}`;
  }

  // The glow is one blur applied to the whole drawing rather than a halo per
  // stroke: resvg composites it once, and it matches how the canvas blooms.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">` +
    `<defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="6" result="b"/>` +
    `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter></defs>` +
    `<g filter="url(#glow)">${paths.join("")}${dots.join("")}</g>` +
    `</svg>`
  );
}

/** The SVG as a `data:` URI, for embedding in an `<img>`. */
export function treeDataUri(options: TreeSvgOptions): string {
  const svg = renderTreeSvg(options);
  // The markup is ASCII (colours are hex/rgb, paths are digits), so this is
  // safe without a UTF-8 pre-encode step.
  const base64 =
    typeof Buffer === "undefined"
      ? btoa(svg)
      : Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
