/**
 * Where a URL sits in the tree.
 *
 * Pure, so the mapping from route to canopy can be reasoned about and tested
 * without a browser. The renderer uses it to pick the light and the camera
 * target; later work will use it to resolve a node from a deep link.
 */

export type TreeSection = "home" | "writing" | "work";

export type TreeRoute = {
  section: TreeSection;
  /** Slug of the entry being viewed, or null for an index or the home page. */
  slug: string | null;
};

export function readRoute(pathname: string): TreeRoute {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { section: "home", slug: null };

  const section: TreeSection =
    segments[0] === "blog" ? "writing" : segments[0] === "projects" ? "work" : "home";

  // Exactly two segments is an entry page. `/blog/tags/meta` has three and must
  // never be mistaken for a post called "tags".
  const slug = section !== "home" && segments.length === 2 ? segments[1] : null;

  return { section, slug };
}
