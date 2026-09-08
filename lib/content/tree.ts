import "server-only";

import { cache } from "react";

import { isoDate } from "@/lib/format";
import type { GraftEntry } from "@/lib/tree/graft";
import { hashSeed } from "@/lib/tree/math";

import { getPosts } from "./posts";
import { getProjects } from "./projects";

/**
 * What the canopy needs to know about the portfolio.
 *
 * The tree lives in the root layout, so this is read once per render for every
 * route rather than only on the home page. It is the single place the content
 * layer meets the tree, and it stays `server-only` — the canvas receives plain
 * serializable entries and never touches `content/` itself.
 */
/** An entry, plus what it takes to render it as a link. */
export type TreeItem = GraftEntry & {
  title: string;
  href: string;
};

export type TreeContent = {
  /** Everything published, with titles — for anything that renders the tree. */
  items: TreeItem[];
  /**
   * The same list, stripped to what the canvas needs. Kept separate so titles
   * are not shipped to the client twice on every page.
   */
  entries: GraftEntry[];
  /** Hashed from the slugs: the same portfolio always grows the same tree. */
  seed: number;
  /** The canopy thickens as the portfolio does. */
  density: number;
};

export const getTreeContent = cache(async (): Promise<TreeContent> => {
  const [projects, posts] = await Promise.all([getProjects(), getPosts()]);

  const items: TreeItem[] = [
    ...projects.map((project) => ({
      slug: project.slug,
      kind: "project" as const,
      key: isoDate(project.frontmatter.date),
      title: project.frontmatter.title,
      href: `/projects/${project.slug}`,
    })),
    ...posts.map((post) => ({
      slug: post.slug,
      kind: "post" as const,
      key: isoDate(post.frontmatter.date),
      title: post.frontmatter.title,
      href: `/blog/${post.slug}`,
    })),
  ].sort((a, b) => `${a.kind}:${a.slug}`.localeCompare(`${b.kind}:${b.slug}`));

  const entries: GraftEntry[] = items.map(({ slug, kind, key }) => ({ slug, kind, key }));

  // Sorted before hashing so a directory listing coming back in a different
  // order cannot reshape the tree. Only publishing, renaming or removing does.
  const seed = hashSeed(entries.map((entry) => `${entry.kind}:${entry.slug}`));
  const density = Math.min(1.8, 0.85 + entries.length * 0.06);

  return { items, entries, seed, density };
});
