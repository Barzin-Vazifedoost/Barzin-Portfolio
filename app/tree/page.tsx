import type { Metadata } from "next";

import { PageShell } from "@/components/page-shell";
import TreeMap, { type TreeMapItem, type TreeMapNode } from "@/components/tree-map";
import { getTreeContent } from "@/lib/content/tree";
import { CANONICAL_VIEWPORT, buildTree } from "@/lib/tree/build";
import { graftContent } from "@/lib/tree/graft";
import { contentSkeleton, traverseContent, type TraversalOrder } from "@/lib/tree/traverse";

export const metadata: Metadata = {
  title: "The tree",
  description: "The structure everything on this site hangs off, and three ways to read it.",
  alternates: { canonical: "/tree" },
};

/**
 * The canopy, as data.
 *
 * All of this runs on the server — which is the payoff of keeping `lib/tree/*`
 * free of DOM and canvas. The same builder that grows the background here
 * produces a static, crawlable, keyboard-reachable map of the site, against the
 * canonical desktop viewport so the structure matches what a desktop visitor
 * sees behind the page.
 */
export default async function TreePage() {
  const { items, entries, seed, density } = await getTreeContent();

  const topology = buildTree({ ...CANONICAL_VIEWPORT, seed, density });
  const graft = graftContent(topology, entries);
  const skeleton = contentSkeleton(topology, graft);

  const bySlug = new Map(items.map((item) => [item.slug, item]));

  const nodes: TreeMapNode[] = skeleton.nodes.map((index) => {
    const branch = topology.branches[index];
    const slug = graft.byBranch.get(index) ?? null;
    const item = slug ? bySlug.get(slug) : undefined;
    const parent = branch.parent === -1 ? null : topology.branches[branch.parent].id;

    return {
      id: branch.id,
      depth: branch.depth,
      // The skeleton carries every ancestor of every anchor, so a node's real
      // parent is always in it — except the root's, which is nothing.
      parent,
      children: (skeleton.children.get(index) ?? []).map((child) => topology.branches[child].id),
      slug,
      title: item?.title ?? null,
      href: item?.href ?? null,
      kind: item?.kind ?? null,
    };
  });

  const toItems = (order: TraversalOrder): TreeMapItem[] =>
    traverseContent(topology, graft, order)
      .map((slug) => bySlug.get(slug))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
      .map(({ slug, title, href, kind }) => ({ slug, title, href, kind }));

  const orders = {
    in: toItems("in"),
    pre: toItems("pre"),
    level: toItems("level"),
  };

  return (
    <PageShell
      eyebrow="Structure"
      title="The tree"
      lead="Everything published hangs off one structure — writing to the left of the trunk, work to the right. This is that structure, walkable. The canopy behind the page is the same tree."
      aside={`${items.length} ${items.length === 1 ? "node" : "nodes"} · depth ${topology.maxDepth}`}
    >
      {items.length === 0 ? (
        <p className="text-[var(--text-dim)]">Nothing published yet, so nothing has grown.</p>
      ) : (
        <TreeMap rootId={topology.branches[0].id} nodes={nodes} orders={orders} />
      )}
    </PageShell>
  );
}
