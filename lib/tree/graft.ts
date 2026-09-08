/**
 * Grafting: attaching published entries to real branches.
 *
 * The canopy's silhouette is still grown procedurally — it was tuned by eye and
 * is the site's face, so this does not rebuild it. What it does is decide which
 * existing branch *is* each project and each post, deterministically, which is
 * what turns the tree from a backdrop into something addressable: a route can
 * ask where it lives, and the renderer can light the path to it.
 *
 * The split is the one the site is built on — writing leans left, work leans
 * right — so which side of the trunk a thing sits on carries meaning.
 *
 * Pure and viewport-independent in its ordering: the same content always lands
 * on the same branch ids for a given tree.
 */

import type { TreeTopology } from "./build";

export type GraftKind = "post" | "project";

export type GraftEntry = {
  slug: string;
  kind: GraftKind;
  /** Sort key — an ISO date. Newest entries get the most prominent branches. */
  key: string;
};

export type Graft = {
  /** slug → branch index. */
  bySlug: Map<string, number>;
  /** branch index → slug, for the renderer's anchor pass. */
  byBranch: Map<number, string>;
  /** Branch indices carrying content, in assignment order. */
  anchors: number[];
};

/** Anchors sit out in the canopy, never on the trunk. */
const MIN_ANCHOR_DEPTH = 2;
/** Minimum spacing between anchors, as a fraction of the smaller viewport axis. */
const SPREAD_RATIO = 0.08;

/**
 * Prominence: tips first, then whatever reaches highest, then id so ties are
 * broken deterministically rather than by array order.
 */
function byProminence(topology: TreeTopology) {
  return (a: number, b: number): number => {
    const x = topology.branches[a];
    const y = topology.branches[b];
    if (x.isTip !== y.isTip) return x.isTip ? -1 : 1;
    if (x.restY !== y.restY) return x.restY - y.restY;
    return x.id < y.id ? -1 : 1;
  };
}

/**
 * Walks candidates in prominence order and takes the first `count` that are far
 * enough apart to read as separate nodes, then relaxes the spacing to fill any
 * shortfall. Greedy rather than optimal — it only has to look deliberate.
 *
 * `avoid` carries the anchors already placed by earlier groups. Without it the
 * two sides are spaced independently, and a post and a project can end up on
 * top of each other where the subtrees meet over the trunk.
 */
function spread(
  topology: TreeTopology,
  candidates: number[],
  count: number,
  avoid: readonly number[],
): number[] {
  if (count <= 0) return [];
  const minSep = Math.min(topology.width, topology.height) * SPREAD_RATIO;
  const taken: number[] = [];

  for (const index of candidates) {
    if (taken.length >= count) break;
    const branch = topology.branches[index];
    const clearOf = (other: number): boolean => {
      const o = topology.branches[other];
      return Math.hypot(o.restX - branch.restX, o.restY - branch.restY) >= minSep;
    };
    if (taken.every(clearOf) && avoid.every(clearOf)) taken.push(index);
  }

  // Not enough room to keep them apart — fall back to plain prominence order
  // rather than leaving entries unplaced.
  if (taken.length < count) {
    for (const index of candidates) {
      if (taken.length >= count) break;
      if (!taken.includes(index)) taken.push(index);
    }
  }

  return taken;
}

export function graftContent(
  topology: TreeTopology,
  entries: readonly GraftEntry[],
): Graft {
  const bySlug = new Map<string, number>();
  const byBranch = new Map<number, string>();
  const anchors: number[] = [];
  if (entries.length === 0 || topology.branches.length === 0) {
    return { bySlug, byBranch, anchors };
  }

  const order = byProminence(topology);

  const candidates = topology.branches
    .filter((branch) => branch.depth >= MIN_ANCHOR_DEPTH)
    .map((branch) => branch.index);

  // Side is subtree membership, decided at the first fork off the trunk — not
  // a branch's own angle. Otherwise a twig that happens to lean the wrong way
  // puts a post in among the projects, and every reading order interleaves.
  const left = candidates.filter((i) => topology.branches[i].side === -1).sort(order);
  const right = candidates.filter((i) => topology.branches[i].side === 1).sort(order);

  // Newest first, so the most recent work gets the branch that reaches highest.
  // Slug breaks ties, so two entries sharing a date cannot swap places between
  // builds.
  const sorted = [...entries].sort((a, b) =>
    a.key === b.key ? (a.slug < b.slug ? -1 : 1) : a.key < b.key ? 1 : -1,
  );
  const posts = sorted.filter((entry) => entry.kind === "post");
  const projects = sorted.filter((entry) => entry.kind === "project");

  // A narrow viewport can leave one side with almost nothing; borrowing from
  // the other side beats dropping an entry off the tree entirely.
  const pool = (own: number[], other: number[], need: number): number[] =>
    own.length >= need ? own : [...own, ...other.filter((i) => !own.includes(i))];

  const assign = (group: GraftEntry[], branches: number[]): void => {
    // `anchors` is what has been placed so far, so each group is spaced against
    // every earlier one as well as against itself.
    const chosen = spread(topology, branches, group.length, anchors);
    for (const [i, entry] of group.entries()) {
      const index = chosen[i];
      if (index === undefined) continue;
      bySlug.set(entry.slug, index);
      byBranch.set(index, entry.slug);
      anchors.push(index);
    }
  };

  assign(posts, pool(left, right, posts.length));
  assign(
    projects,
    // Anything already carrying a post is off the table.
    pool(right, left, projects.length).filter((i) => !byBranch.has(i)),
  );

  return { bySlug, byBranch, anchors };
}
