/**
 * Where a URL sits in the tree.
 *
 * Pure, so the mapping from route to canopy can be reasoned about and tested
 * without a browser. The renderer uses it to pick the light and the camera
 * target; later work will use it to resolve a node from a deep link.
 */

export type TreeSection = "home" | "writing" | "work" | "roots";

export type TreeRoute = {
  section: TreeSection;
  /** Slug of the entry being viewed, or null for an index or the home page. */
  slug: string | null;
};

export function readRoute(pathname: string): TreeRoute {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { section: "home", slug: null };

  const section: TreeSection =
    segments[0] === "blog"
      ? "writing"
      : segments[0] === "projects"
        ? "work"
        : // History lives underground. The resume is the root system.
          segments[0] === "resume"
          ? "roots"
          : "home";

  // Exactly two segments is an entry page. `/blog/tags/meta` has three and must
  // never be mistaken for a post called "tags". Only writing and work have
  // entries; the resume is a single page.
  const slug =
    (section === "writing" || section === "work") && segments.length === 2
      ? segments[1]
      : null;

  return { section, slug };
}
