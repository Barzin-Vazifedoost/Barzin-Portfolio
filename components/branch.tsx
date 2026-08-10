import type { ReactNode } from "react";

import { SPINE, boughPath, twigPath } from "@/lib/tree/spine";

/**
 * The tree, in the page.
 *
 * Every list on this site used to be a straight left rule with a round dot per
 * item — a timeline wearing green. These are its replacement: a tapering bough
 * with a real twig curving out to each entry, thicker near the base and finer
 * toward the tips.
 *
 * All server components. The geometry is pure and derived from each item's
 * position, so this needs no measurement, no effects and no JavaScript, and it
 * renders identically in a feed reader's stripped HTML or with styles off.
 */

export type Register = "canopy" | "roots";

/**
 * A list that grows. Wraps `<ul>`/`<ol>` and paints the bough behind it; each
 * child should be a `<BranchItem>`.
 */
export function Bough({
  children,
  as: Tag = "ul",
  register = "canopy",
  className = "",
  ...rest
}: {
  children: ReactNode;
  as?: "ul" | "ol";
  register?: Register;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">) {
  const roots = register === "roots";

  return (
    <div className="relative">
      {/*
        preserveAspectRatio="none" lets the trunk stretch to the list's height
        while its width stays in real pixels — the whole reason this is a filled
        shape rather than a stroke.
      */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-full"
        style={{ width: SPINE.boughWidth }}
        viewBox={`0 0 ${SPINE.boughWidth} ${SPINE.boughHeight}`}
        preserveAspectRatio="none"
        fill="none"
      >
        <path d={boughPath(roots)} fill="var(--deep)" fillOpacity="0.85" />
      </svg>

      <Tag className={`relative ${className}`} {...rest}>
        {children}
      </Tag>
    </div>
  );
}

/**
 * One entry hanging off the bough. `index` and `total` decide the twig's bend
 * and weight, so a list tapers from base to tip the way a branch does.
 */
export function BranchItem({
  index,
  total,
  register = "canopy",
  children,
  className = "",
  ...rest
}: {
  index: number;
  total: number;
  register?: Register;
  children: ReactNode;
  className?: string;
} & Omit<React.LiHTMLAttributes<HTMLLIElement>, "children" | "className">) {
  const twig = twigPath(index, total, register === "roots");

  return (
    <li className={`group relative ${className}`} {...rest}>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 overflow-visible"
        width={twig.width}
        height={twig.height}
        viewBox={`0 0 ${twig.width} ${twig.height}`}
        fill="none"
      >
        <path
          d={twig.d}
          stroke="var(--mid)"
          strokeOpacity="0.55"
          strokeWidth={twig.strokeWidth}
          strokeLinecap="round"
          className="transition-[stroke-opacity] duration-500 ease-[var(--ease-flow)] group-hover:stroke-[var(--neon)] group-hover:[stroke-opacity:0.95]"
        />
        {/* The node where the twig meets the entry. */}
        <circle
          cx={twig.nodeX}
          cy={twig.nodeY}
          r={2.6}
          fill="var(--mid)"
          className="transition-all duration-500 ease-[var(--ease-flow)] group-hover:fill-[var(--neon)] group-hover:drop-shadow-[0_0_8px_var(--neon)]"
        />
      </svg>

      {children}
    </li>
  );
}

/**
 * A chip, shaped like a leaf rather than a pill — one pointed corner is the
 * difference between "tag" and "growth". Used for stacks, tags and skills.
 */
export function Leaf({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`meta inline-block rounded-bl-full rounded-br-sm rounded-tl-full rounded-tr-full border border-[var(--deep)] px-3 py-1 text-[var(--text-faint)] transition-colors duration-500 ease-[var(--ease-flow)] ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Section heading: a node on the trunk with a branch running off it. Replaces
 * the dot-plus-rule that every section used to open with.
 *
 * This is the real `<h2>`, so a section labels itself with the heading you can
 * see. Pages used to pair a visually-hidden `<h2>` with this, which announced
 * every section title twice and listed each one twice in the heading outline.
 */
export function BranchHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-8 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="block h-1.5 w-1.5 rounded-full bg-[var(--neon)] shadow-[0_0_12px_var(--neon)]"
      />
      <span className="eyebrow">{children}</span>
      <svg
        aria-hidden="true"
        className="ml-1 h-3 flex-1"
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* A hairline limb with two small offshoots, instead of a plain rule. */}
        <path
          d="M0 6 C 60 6, 90 3, 200 2"
          stroke="var(--deep)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M52 5.4 C 66 5.4, 72 9, 86 10.5"
          stroke="var(--deep)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </h2>
  );
}
