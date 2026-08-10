import { ImageResponse } from "next/og";

import { getTreeContent } from "@/lib/content/tree";
import { GROWTH_TREE_PALETTE } from "@/lib/tree/palette";
import { treeDataUri } from "@/lib/tree/svg";

/**
 * The home-screen icon.
 *
 * 180px is enough room for a real tree rather than the reduced fork the 32px
 * favicon has to settle for, so this grows the actual topology — capped a few
 * levels short, because the finest twigs land under a pixel at this size and
 * only muddy the silhouette.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const { seed } = await getTreeContent();

  const tree = treeDataUri({
    // Grown in a landscape frame, which is what `buildTree` lays out for, then
    // cropped to the canopy by `fit` — the branch angles stay the ones the
    // topology actually produces rather than a squashed version of them.
    width: 320,
    height: 200,
    seed,
    // A full-density canopy at this size is a green smudge.
    density: 0.5,
    maxDepth: 5,
    tips: false,
    fit: true,
    palette: GROWTH_TREE_PALETTE,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: GROWTH_TREE_PALETTE.bg,
        }}
      >
        {/* Satori renders plain elements; next/image has no meaning here. */}
        <img src={tree} alt="" width={size.width} height={size.height} />
      </div>
    ),
    size,
  );
}
