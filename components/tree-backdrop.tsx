"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import type { GrowthTreePalette } from "@/components/growth-tree";
import { illuminateTree } from "@/lib/tree-events";
import type { GraftEntry } from "@/lib/tree/graft";
import { readRoute, type TreeSection } from "@/lib/tree/route";

/**
 * The one tree, mounted once in the root layout.
 *
 * Because it lives above the route slot it never unmounts, so navigating is a
 * camera move rather than a teardown: the canopy keeps growing, the wind keeps
 * blowing, and the page you asked for lights up inside a scene that was already
 * there.
 *
 * `ssr: false` is only legal from inside a client boundary, which is why this
 * component exists rather than the layout importing the canvas directly.
 */
const GrowthTree = dynamic(() => import("@/components/growth-tree"), { ssr: false });

export type TreeBackdropProps = {
  seed: number;
  density: number;
  entries: GraftEntry[];
};

/**
 * The light shifts with where you are. Same ramp, rotated a little: writing
 * sits under cooler mint, work under warmer growth-green. Small on purpose —
 * a page should feel like a different part of one organism, never like a
 * different theme.
 */
const SECTION_PALETTE: Record<TreeSection, Partial<GrowthTreePalette>> = {
  home: {},
  writing: {
    deep: "#0a3d2e",
    mid: "#1a7a5e",
    neon: "#2dffb0",
    core: "#c6fff0",
  },
  work: {
    deep: "#123d0f",
    mid: "#2f7a1f",
    neon: "#6dff14",
    core: "#dcffc4",
  },
  // Underground: the one place the site leaves green behind, because the roots
  // are not the canopy and should not pretend to be.
  roots: {
    deep: "#3b2a12",
    mid: "#9a7430",
    neon: "#e0a44a",
    core: "#f0dcb4",
  },
};

/**
 * Legibility. The canopy now sits behind every route, so each layout gets the
 * wash it actually needs: the home column is left-aligned against an open
 * canopy, while inner pages are a centred measure with the tree showing past
 * both shoulders.
 */
function Scrim({ section }: { section: TreeSection }) {
  if (section === "home") {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 z-[1] w-full lg:w-[62%]"
        style={{
          background:
            "linear-gradient(100deg, rgba(5,8,5,0.94) 0%, rgba(5,8,5,0.88) 38%, rgba(5,8,5,0.55) 66%, rgba(5,8,5,0) 100%)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        background:
          "linear-gradient(90deg, rgba(5,8,5,0.30) 0%, rgba(5,8,5,0.92) 16%, rgba(5,8,5,0.94) 84%, rgba(5,8,5,0.30) 100%)",
      }}
    />
  );
}

/**
 * One delegated listener rather than a prop on every link. Any anchor pointing
 * at an entry — in a list, in prose, in the nav — lights its own path through
 * the canopy, and nothing has to be wired up to opt in.
 *
 * Bound to `pointerover`/`focusin` so it answers to the keyboard as well as the
 * mouse: tabbing through a list of posts walks the light through the tree.
 */
function useLinkIllumination(): void {
  useEffect(() => {
    const slugFor = (target: EventTarget | null): string | null => {
      if (!(target instanceof Element)) return null;
      const anchor = target.closest("a");
      const href = anchor?.getAttribute("href");
      // Same-document paths only. Anything absolute or external is not ours.
      if (!href || !href.startsWith("/")) return null;
      return readRoute(href).slug;
    };

    const enter = (event: Event): void => {
      const slug = slugFor(event.target);
      if (slug) illuminateTree(slug);
    };
    const leave = (event: Event): void => {
      if (slugFor(event.target)) illuminateTree(null);
    };

    document.addEventListener("pointerover", enter);
    document.addEventListener("pointerout", leave);
    document.addEventListener("focusin", enter);
    document.addEventListener("focusout", leave);
    return () => {
      document.removeEventListener("pointerover", enter);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", enter);
      document.removeEventListener("focusout", leave);
      illuminateTree(null);
    };
  }, []);
}

export default function TreeBackdrop({ seed, density, entries }: TreeBackdropProps) {
  const pathname = usePathname();
  const { section, slug } = useMemo(() => readRoute(pathname), [pathname]);
  useLinkIllumination();

  return (
    <>
      <GrowthTree
        seed={seed}
        density={density}
        entries={entries}
        focusSlug={slug}
        palette={SECTION_PALETTE[section]}
      />
      <Scrim section={section} />
    </>
  );
}
