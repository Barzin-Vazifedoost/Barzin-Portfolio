"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { illuminateTree } from "@/lib/tree-events";
import { TRAVERSAL_LABELS, TRAVERSAL_MEANING, type TraversalOrder } from "@/lib/tree/traverse";

/**
 * The tree as something you can walk.
 *
 * The canopy on the canvas is unreachable by design — it is `aria-hidden`
 * scenery. This is its twin in the DOM: the same nodes, the same parent and
 * child relationships, reachable with a keyboard and legible to a screen
 * reader. Moving through it lights the matching path on the canvas, so the two
 * halves stay one thing.
 *
 * Keys are the ones an engineer already has in their fingers: `h` and `l` climb
 * and descend, `j` and `k` move between siblings, `g` returns to the root,
 * Enter opens. Arrows do the same, so nobody has to know that.
 *
 * Follows the ARIA tree pattern: the treeitem itself is the focus target and
 * the whole tree is one tab stop, so tabbing past it never means pressing tab
 * thirty times.
 */

export type TreeMapNode = {
  id: string;
  depth: number;
  parent: string | null;
  children: string[];
  slug: string | null;
  title: string | null;
  href: string | null;
  kind: "post" | "project" | null;
};

export type TreeMapItem = {
  slug: string;
  title: string;
  href: string;
  kind: "post" | "project";
};

export type TreeMapProps = {
  rootId: string;
  nodes: TreeMapNode[];
  orders: Record<TraversalOrder, TreeMapItem[]>;
};

const ORDERS: TraversalOrder[] = ["in", "pre", "level"];

export default function TreeMap({ rootId, nodes, orders }: TreeMapProps) {
  const router = useRouter();
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const [activeId, setActiveId] = useState(rootId);
  const [order, setOrder] = useState<TraversalOrder>("in");
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  const identicalOrders = useMemo(() => {
    const readings = ORDERS.map((key) => orders[key].map((item) => item.slug).join());
    return new Set(readings).size === 1;
  }, [orders]);

  const focusNode = useCallback(
    (id: string): void => {
      setActiveId(id);
      itemRefs.current.get(id)?.focus();
      illuminateTree(byId.get(id)?.slug ?? null);
    },
    [byId],
  );

  /** Sibling in `step` direction, or undefined at either end. */
  const sibling = useCallback(
    (id: string, step: number): string | undefined => {
      const node = byId.get(id);
      if (!node) return undefined;
      const parent = node.parent ? byId.get(node.parent) : null;
      // The root has no siblings, so j/k there fall through to its children —
      // otherwise the very first keypress does nothing.
      const list = parent ? parent.children : [id];
      return list[list.indexOf(id) + step];
    },
    [byId],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>, id: string): void => {
      const node = byId.get(id);
      if (!node) return;

      const move = (target: string | null | undefined): void => {
        if (!target || !byId.has(target)) return;
        event.preventDefault();
        event.stopPropagation();
        focusNode(target);
      };

      switch (event.key) {
        case "l":
        case "ArrowRight":
          return move(node.children[0]);
        case "h":
        case "ArrowLeft":
          return move(node.parent);
        case "j":
        case "ArrowDown":
          return move(sibling(id, 1) ?? node.children[0]);
        case "k":
        case "ArrowUp":
          return move(sibling(id, -1) ?? node.parent);
        case "g":
        case "Home":
          return move(rootId);
        case "Enter":
          if (node.href) {
            event.preventDefault();
            event.stopPropagation();
            router.push(node.href);
          }
          return;
        default:
          return;
      }
    },
    [byId, focusNode, rootId, router, sibling],
  );

  const register = useCallback(
    (id: string) =>
      (el: HTMLLIElement | null): void => {
        if (el) itemRefs.current.set(id, el);
        else itemRefs.current.delete(id);
      },
    [],
  );

  const renderNode = (id: string): React.ReactNode => {
    const node = byId.get(id);
    if (!node) return null;
    const isActive = id === activeId;

    return (
      <li
        key={id}
        ref={register(id)}
        role="treeitem"
        aria-level={node.depth + 1}
        aria-selected={isActive}
        aria-expanded={node.children.length > 0 ? true : undefined}
        // Roving tabindex: the tree is a single tab stop, then the keys take over.
        tabIndex={isActive ? 0 : -1}
        onKeyDown={(event) => onKeyDown(event, id)}
        onFocus={(event) => {
          // Focus bubbles from descendants; only claim it for this node.
          if (event.target !== event.currentTarget) return;
          setActiveId(id);
          illuminateTree(node.slug);
        }}
        onMouseEnter={() => illuminateTree(node.slug)}
        className="relative py-0.5 outline-none"
      >
        <span
          aria-hidden="true"
          className={`absolute -left-[21px] top-[0.85em] block h-1.5 w-1.5 rounded-full transition-all duration-300 ease-[var(--ease-flow)] ${
            isActive
              ? "bg-[var(--neon)] shadow-[0_0_12px_var(--neon)]"
              : node.slug
                ? "bg-[var(--mid)]"
                : "bg-[var(--deep)]"
          }`}
        />

        {node.href && node.title ? (
          <Link
            href={node.href}
            // Not a tab stop: the treeitem owns focus. Still clickable.
            tabIndex={-1}
            className={`transition-colors duration-300 ease-[var(--ease-flow)] hover:text-[var(--core)] ${
              isActive ? "text-[var(--core)]" : "text-[var(--text)]"
            }`}
          >
            <span className="meta mr-2">{node.id}</span>
            {node.title}
          </Link>
        ) : (
          <span className={`meta ${isActive ? "text-[var(--mid)]" : ""}`}>{node.id}</span>
        )}

        {node.children.length > 0 ? (
          <ul role="group" className="ml-1 mt-1 border-l border-[var(--deep)]/50 pl-5">
            {node.children.map(renderNode)}
          </ul>
        ) : null}
      </li>
    );
  };

  // Breadcrumb of the active node, one segment per level.
  const trail: string[] = [];
  for (
    let node = byId.get(activeId);
    node;
    node = node.parent ? byId.get(node.parent) : undefined
  ) {
    trail.unshift(node.parent === null ? "root" : (node.id.split(".").pop() ?? node.id));
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <p className="eyebrow">Walk it</p>
        <p className="meta">
          <kbd>h</kbd> parent · <kbd>l</kbd> child · <kbd>j</kbd> <kbd>k</kbd> siblings ·{" "}
          <kbd>g</kbd> root · <kbd>↵</kbd> open
        </p>
        <p className="meta ml-auto text-[var(--mid)]" aria-live="polite">
          {trail.join(" · ")}
        </p>
      </div>

      <ul
        role="tree"
        aria-label="Site structure"
        className="border-l border-[var(--deep)]/60 pl-5"
      >
        {renderNode(rootId)}
      </ul>

      <div className="mt-16">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="eyebrow mr-2">Reading orders</p>
          {ORDERS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setOrder(key)}
              aria-pressed={order === key}
              className={`meta rounded-full border px-3 py-1 transition-colors duration-300 ease-[var(--ease-flow)] ${
                order === key
                  ? "border-[var(--neon)] text-[var(--neon)]"
                  : "border-[var(--deep)] text-[var(--text-faint)] hover:border-[var(--mid)]"
              }`}
            >
              {TRAVERSAL_LABELS[key]}
            </button>
          ))}
        </div>

        <p className="mb-4 max-w-[58ch] text-[var(--text-dim)]">{TRAVERSAL_MEANING[order]}</p>

        {/*
          With only a few entries there is not enough structure between them for
          the three walks to disagree, and three identical lists look like a
          bug. Say so instead of pretending.
        */}
        {identicalOrders ? (
          <p className="mb-6 max-w-[58ch] text-[var(--text-faint)]">
            At this size all three walks happen to agree. They diverge once
            there is enough in the canopy to disagree about.
          </p>
        ) : (
          <div className="mb-6" />
        )}

        {orders[order].length === 0 ? (
          <p className="text-[var(--text-dim)]">Nothing published yet.</p>
        ) : (
          <ol className="border-l border-[var(--deep)]/60">
            {orders[order].map((item, index) => (
              <li key={item.slug} className="group relative">
                <Link
                  href={item.href}
                  className="flex items-baseline gap-4 py-3 pl-6 transition-colors duration-300 ease-[var(--ease-flow)] hover:bg-[var(--mid)]/[0.04]"
                >
                  <span className="meta w-6 shrink-0">{String(index + 1).padStart(2, "0")}</span>
                  <span className="transition-colors duration-300 group-hover:text-[var(--core)]">
                    {item.title}
                  </span>
                  <span className="meta ml-auto">{item.kind}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
