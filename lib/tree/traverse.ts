/**
 * Walking the tree.
 *
 * The same structure, read three ways. In-order emits the canopy left to right,
 * which is the chronological archive; pre-order goes deep before it goes wide,
 * which is the order you would walk someone through your work; level-order goes
 * wide before it goes deep, which is the overview. One data structure, three
 * readings — none of them a second copy of the content.
 *
 * Junctions here fork two or three ways rather than strictly two, so in-order is
 * the usual generalisation: first child, then the node, then the rest.
 */

import type { Graft } from "./graft";
import type { TreeTopology } from "./build";

export type TraversalOrder = "pre" | "in" | "level";

export const TRAVERSAL_LABELS: Record<TraversalOrder, string> = {
  in: "In-order",
  pre: "Pre-order",
  level: "Level-order",
};

/** What each order is actually good for, in the site's own terms. */
export const TRAVERSAL_MEANING: Record<TraversalOrder, string> = {
  in: "Left to right across the canopy — writing before work, oldest growth first.",
  pre: "Deep before wide. The order you would walk someone through it in person.",
  level: "Wide before deep. Everything at one remove from the trunk, then the next.",
};

export function traverse(topology: TreeTopology, order: TraversalOrder): number[] {
  const { branches } = topology;
  if (branches.length === 0) return [];
  const out: number[] = [];

  if (order === "level") {
    // Breadth-first. `head` walks the array rather than shifting it, which
    // would be quadratic on a wide canopy.
    const queue = [0];
    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head];
      out.push(index);
      for (const child of branches[index].children) queue.push(child);
    }
    return out;
  }

  // Iterative depth-first, so a deep tree cannot blow the stack. The explicit
  // stack carries how many children of a node have been dealt with so far.
  type Frame = { index: number; next: number; emitted: boolean };
  const stack: Frame[] = [{ index: 0, next: 0, emitted: false }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const branch = branches[frame.index];

    if (order === "pre" && !frame.emitted) {
      frame.emitted = true;
      out.push(frame.index);
    }

    // In-order: the node lands after its first child, or immediately if it has
    // none. This is the standard generalisation to n-ary trees.
    if (order === "in" && !frame.emitted && (frame.next === 1 || branch.children.length === 0)) {
      frame.emitted = true;
      out.push(frame.index);
    }

    if (frame.next < branch.children.length) {
      const child = branch.children[frame.next];
      frame.next += 1;
      stack.push({ index: child, next: 0, emitted: false });
      continue;
    }

    if (!frame.emitted) {
      frame.emitted = true;
      out.push(frame.index);
    }
    stack.pop();
  }

  return out;
}

/**
 * The same three orders, restricted to branches that actually carry something
 * you published. This is the version a reader sees.
 */
export function traverseContent(
  topology: TreeTopology,
  graft: Graft,
  order: TraversalOrder,
): string[] {
  const slugs: string[] = [];
  for (const index of traverse(topology, order)) {
    const slug = graft.byBranch.get(index);
    if (slug !== undefined) slugs.push(slug);
  }
  return slugs;
}

/** Root-first path down to `index`. Empty if the index is out of range. */
export function pathToRoot(topology: TreeTopology, index: number): number[] {
  if (index < 0 || index >= topology.branches.length) return [];
  const path: number[] = [];
  for (let i = index; i !== -1; i = topology.branches[i].parent) path.push(i);
  return path.reverse();
}

/**
 * The smallest tree that still connects the root to everything you published:
 * every anchor plus the ancestors needed to reach it. This is the structure
 * worth showing a reader — the other few hundred branches are canopy filler.
 */
export type Skeleton = {
  /** Branch indices in the skeleton, parents before children. */
  nodes: number[];
  /** Children of each skeleton node, restricted to the skeleton. */
  children: Map<number, number[]>;
  /** Skeleton nodes carrying content. */
  anchors: Set<number>;
};

export function contentSkeleton(topology: TreeTopology, graft: Graft): Skeleton {
  const keep = new Set<number>();
  for (const index of graft.anchors) {
    for (const step of pathToRoot(topology, index)) keep.add(step);
  }

  // Ascending index order puts parents before children, because build guarantees
  // a parent's index is always lower than its children's.
  const nodes = [...keep].sort((a, b) => a - b);
  const children = new Map<number, number[]>();
  for (const index of nodes) {
    children.set(
      index,
      topology.branches[index].children.filter((child) => keep.has(child)),
    );
  }

  return { nodes, children, anchors: new Set(graft.anchors) };
}
