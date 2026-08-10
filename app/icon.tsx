import { ImageResponse } from "next/og";

import { GROWTH_TREE_PALETTE } from "@/lib/tree/palette";

/**
 * The favicon, replacing the stock `create-next-app` one.
 *
 * Not the whole tree: at 32px a nine-deep canopy is an illegible smudge. This
 * is the smallest true piece of it — a trunk, one fork, and a lit node at each
 * tip. That node, neon on near-black, is the site's most repeated mark: it ends
 * every branch in the canopy, opens every section heading, and marks the
 * current page in the nav.
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const { bg, deep, mid, neon, core } = GROWTH_TREE_PALETTE;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: bg,
        }}
      >
        <svg width={size.width} height={size.height} viewBox="0 0 32 32" fill="none">
          {/* Trunk, tapering as it rises. */}
          <path
            d="M16 31 L16 18"
            stroke={deep}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M16 22 L16 17"
            stroke={mid}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* The fork. Asymmetric, like the canopy: it opens rightward. */}
          <path
            d="M16 18 Q 15 13 9 8"
            stroke={mid}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M16 18 Q 18 12 23 7"
            stroke={mid}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Lit tips. */}
          <circle cx="9" cy="8" r="3.2" fill={neon} opacity="0.28" />
          <circle cx="23" cy="7" r="3.2" fill={neon} opacity="0.28" />
          <circle cx="9" cy="8" r="1.9" fill={core} />
          <circle cx="23" cy="7" r="1.9" fill={core} />
        </svg>
      </div>
    ),
    size,
  );
}
