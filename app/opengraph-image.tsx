import { ImageResponse } from "next/og";

import { GROWTH_TREE_PALETTE } from "@/lib/tree/palette";
import { getTreeContent } from "@/lib/content/tree";
import { treeDataUri } from "@/lib/tree/svg";
import { site } from "@/lib/site";

/**
 * The social card.
 *
 * `twitter.card` was already declared as `summary_large_image` with no image
 * behind it, so every link shared to Slack, LinkedIn, Discord or iMessage
 * rendered as a bare text card — and asking for the *large* format made the
 * absence more conspicuous, not less.
 *
 * The canopy on the card is the real one: same seed, same content-derived
 * density, grown through the same code the canvas runs, just settled and
 * emitted as SVG. Publish a project and the card's tree grows with it.
 */

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const { seed, density } = await getTreeContent();

  const tree = treeDataUri({
    width: size.width,
    height: size.height,
    seed,
    density,
    // Push the trunk right so the canopy fills the space beside the text.
    rootXRatio: 0.72,
    palette: GROWTH_TREE_PALETTE,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: GROWTH_TREE_PALETTE.bg,
        }}
      >
        {/* Satori renders plain elements; next/image has no meaning here. */}
        <img
          src={tree}
          alt=""
          width={size.width}
          height={size.height}
          style={{ position: "absolute", top: 0, left: 0 }}
        />

        {/* The same legibility wash the site puts over the canopy. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(100deg, rgba(5,8,5,0.96) 0%, rgba(5,8,5,0.9) 40%, rgba(5,8,5,0.4) 72%, rgba(5,8,5,0) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px",
            // Narrower than the scrim's opaque zone, so nothing sets over the
            // canopy where the wash has already fallen off.
            width: "56%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 10,
                background: GROWTH_TREE_PALETTE.neon,
              }}
            />
            <div
              style={{
                fontSize: 22,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: "#2fa855",
              }}
            >
              {site.name}
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 68,
              lineHeight: 1.08,
              letterSpacing: -2,
              color: GROWTH_TREE_PALETTE.core,
            }}
          >
            {site.tagline}
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 24,
              lineHeight: 1.5,
              color: "#8fae99",
              maxWidth: 520,
            }}
          >
            {site.description}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
