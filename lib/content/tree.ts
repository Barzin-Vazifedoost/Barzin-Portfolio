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
export type TreeContent = {
  /** Every published entry, as something the tree can graft onto a branch. */
  entries: GraftEntry[];
  /** Hashed from the slugs: the same portfolio always grows the same tree. */
  seed: number;
  /** The canopy thickens as the portfolio does. */
  density: number;
};

export const getTreeContent = cache(async (): Promise<TreeContent> => {
  const [projects, posts] = await Promise.all([getProjects(), getPosts()]);

  const entries: GraftEntry[] = [
    ...projects.map((project) => ({
      slug: project.slug,
      kind: "project" as const,
      key: isoDate(project.frontmatter.date),
    })),
    ...posts.map((post) => ({
      slug: post.slug,
      kind: "post" as const,
      key: isoDate(post.frontmatter.date),
    })),
  ].sort((a, b) => `${a.kind}:${a.slug}`.localeCompare(`${b.kind}:${b.slug}`));

  // Sorted before hashing so a directory listing coming back in a different
  // order cannot reshape the tree. Only publishing, renaming or removing does.
  const seed = hashSeed(entries.map((entry) => `${entry.kind}:${entry.slug}`));
  const density = Math.min(1.8, 0.85 + entries.length * 0.06);

  return { entries, seed, density };
});
