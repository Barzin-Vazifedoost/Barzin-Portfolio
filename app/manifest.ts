import type { MetadataRoute } from "next";

import { site } from "@/lib/site";
import { GROWTH_TREE_PALETTE } from "@/lib/tree/palette";

/**
 * Web app manifest. Mostly this exists so an installed shortcut opens on the
 * site's own ground colour instead of a white flash — the theme is dark enough
 * that the default is jarring.
 *
 * The icons are the generated routes in `app/icon.tsx` and `app/apple-icon.tsx`
 * rather than files in `public/`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.tagline}`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: GROWTH_TREE_PALETTE.bg,
    theme_color: GROWTH_TREE_PALETTE.bg,
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
