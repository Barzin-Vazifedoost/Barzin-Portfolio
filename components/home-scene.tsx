"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

import { surgeTree } from "@/lib/tree-events";

/**
 * The home page's client half. It owns layout, the load sequence, and every
 * scroll-linked transform; the server hands it plain serializable props so no
 * animation code ever reaches the content layer.
 *
 * The canvas is loaded with `ssr: false` from inside this client boundary —
 * Next forbids that option in Server Components, which is why the split lives
 * here rather than in `app/page.tsx`.
 */
const GrowthTree = dynamic(() => import("@/components/growth-tree"), { ssr: false });

/** One easing curve for the entire page, so motion reads as flow. */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Load-sequence timings, in seconds. */
const TIMING = {
  /** Delay before the first hero word appears. */
  heroDelay: 0.15,
  /** Gap between hero words. */
  heroStagger: 0.09,
  /** Gap between hero blocks (name → tagline → description → cue). */
  blockStagger: 0.14,
  /** Gap between items inside a section. */
  itemStagger: 0.08,
  reveal: 0.9,
} as const;

/** Scroll-linked ranges for content items entering the viewport. */
const SCROLL = {
  /** Where an item's own progress starts and finishes. */
  offset: ["start end", "center center"] as const,
  /** Pixels travelled upward as an item settles. */
  rise: 72,
  /** Degrees of settle rotation. Alternates sign per item. */
  rotate: 2.6,
  /** Horizontal drift, alternating direction so the column feels alive. */
  drift: 26,
} as const;

export type SceneItem = {
  slug: string;
  href: string;
  title: string;
  summary: string;
  /** Formatted date or role — rendered in the mono voice. */
  meta?: string;
};

export type HomeSceneProps = {
  name: string;
  tagline: string;
  description: string;
  /** Target for the hero's secondary action. */
  email: string;
  projects: SceneItem[];
  posts: SceneItem[];
  counts: { projects: number; posts: number };
  /** Canopy density, derived server-side from how much is published. */
  density: number;
};

/**
 * A faint filament reaching from a content item rightward into the canopy, so
 * the two halves read as one organism. Brightens and draws itself on hover.
 */
function Tendril({ index, active }: { index: number; active: boolean }) {
  const reduced = useReducedMotion();
  const rise = 10 + ((index * 17) % 26);
  const bend = 26 + ((index * 11) % 34);
  const exit = 14 + ((index * 23) % 46);
  const path = `M 0 60 C 96 ${60 - rise}, 188 ${60 - bend}, 400 ${exit}`;

  return (
    <svg
      className="pointer-events-none absolute left-full top-1/2 hidden h-32 w-[46vw] -translate-y-1/2 overflow-visible lg:block"
      viewBox="0 0 400 120"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`tendril-${index}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--neon)" stopOpacity="0.9" />
          <stop offset="60%" stopColor="var(--mid)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--mid)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={path}
        stroke={`url(#tendril-${index})`}
        strokeWidth={active ? 1.6 : 1}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={false}
        animate={
          reduced
            ? { pathLength: 1, opacity: 0.24 }
            : { pathLength: active ? 1 : 0.62, opacity: active ? 0.95 : 0.22 }
        }
        transition={{ duration: 0.85, ease: EASE }}
      />
    </svg>
  );
}

/** Section label in the mono voice, with a node that lights as it scrolls in. */
function Eyebrow({ children }: { children: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Fires slightly before the label reaches the viewport edge.
  const inView = useInView(ref, { once: true, margin: "-12% 0px -12% 0px" });

  return (
    <div ref={ref} className="mb-8 flex items-center gap-3">
      <motion.span
        aria-hidden="true"
        data-reveal
        className="node node-lit"
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.6, ease: EASE }}
      />
      <motion.span
        className="eyebrow"
        data-reveal
        initial={{ opacity: 0, x: -12 }}
        animate={inView ? { opacity: 1, x: 0 } : undefined}
        transition={{ duration: TIMING.reveal, ease: EASE, delay: 0.05 }}
      >
        {children}
      </motion.span>
      <motion.span
        aria-hidden="true"
        data-reveal
        className="ml-2 block h-px flex-1 origin-left bg-gradient-to-r from-[var(--border-strong)] to-transparent"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : undefined}
        transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
      />
    </div>
  );
}

/**
 * A content item whose transform is driven by its own scroll progress, so the
 * column settles as you climb rather than popping on a threshold.
 */
function ItemCard({ item, index }: { item: SceneItem; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);

  // Spread: `SCROLL` is `as const`, and useScroll wants a mutable offset array.
  const { scrollYProgress } = useScroll({ target: ref, offset: [...SCROLL.offset] });
  const direction = index % 2 === 0 ? 1 : -1;

  const y = useTransform(scrollYProgress, [0, 1], [SCROLL.rise, 0]);
  const x = useTransform(scrollYProgress, [0, 1], [SCROLL.drift * direction, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [SCROLL.rotate * direction, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.55], [0, 1]);

  const highlight = (): void => {
    setActive(true);
    surgeTree();
  };

  return (
    <motion.li
      ref={ref}
      data-reveal
      className="group relative py-7"
      // willChange promotes the item to its own compositor layer. Without it,
      // continuously-changing opacity and rotate force the text inside to be
      // re-rasterised on every scroll frame, which is the expensive part.
      style={
        reduced ? undefined : { y, x, rotate, opacity, willChange: "transform, opacity" }
      }
      onMouseEnter={highlight}
      onMouseLeave={() => setActive(false)}
      onFocus={highlight}
      onBlur={() => setActive(false)}
    >
      <Tendril index={index} active={active} />

      {/* The node where the tendril meets the text. */}
      <span aria-hidden="true" className="node absolute -left-[25px] top-[38px]" />

      <h3 className="display text-[length:var(--step-title)] font-medium">
        <Link
          href={item.href}
          className="underline-draw inline-block text-[var(--text)] transition-colors duration-500 ease-[var(--ease-flow)] group-hover:text-[var(--core)]"
        >
          {item.title}
        </Link>
      </h3>

      {item.meta ? <p className="meta mt-2.5">{item.meta}</p> : null}
      <p className="mt-3 max-w-prose text-[var(--text-dim)]">{item.summary}</p>
    </motion.li>
  );
}

/** Quiet mono link with the same drawing underline as item titles. */
function TrailLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="eyebrow underline-draw inline-block text-[var(--mid)] transition-colors duration-400 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
    >
      {children}
    </Link>
  );
}

export default function HomeScene({
  name,
  tagline,
  description,
  email,
  projects,
  posts,
  counts,
  density,
}: HomeSceneProps) {
  // Progress through the page is shown by the header's reading bar, which every
  // page shares — so there is no second indicator here.
  const reduced = useReducedMotion();

  const words = name.split(" ");

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: TIMING.reveal, ease: EASE }}>
      <GrowthTree density={density} />

      {/*
        Legibility scrim: keeps branches from fighting the words. Deliberately
        much lighter than a flat wash — the canvas is the reason to be on this
        page, so the scrim only has to hold contrast under the text column and
        then get out of the way. The stops are the new background colour, so it
        reads as depth rather than as a grey panel laid on top.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 z-[1] w-full lg:w-[68%]"
        style={{
          background:
            "linear-gradient(100deg, rgba(4,8,6,0.9) 0%, rgba(4,8,6,0.78) 34%, rgba(4,8,6,0.4) 62%, rgba(4,8,6,0) 100%)",
        }}
      />

      <div data-tree-ignore className="relative z-10 px-6 sm:px-10">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,48%)_1fr]">
          {/* A container, so the hero can size its type against this column's
              own width rather than the viewport's. */}
          <div className="@container">
            {/* ── Hero ───────────────────────────────────────────────── */}
            {/* svh, not vh: on mobile the dynamic toolbar makes vh taller than
                the visible viewport, which pushes the scroll cue off screen. */}
            <section className="flex min-h-[calc(100svh-var(--nav-h))] flex-col justify-center py-16">
              <motion.p
                className="eyebrow mb-8 flex items-center gap-2.5"
                data-reveal
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: TIMING.heroDelay, ease: EASE }}
              >
                <span aria-hidden="true" className="node node-lit" />
                {counts.projects} {counts.projects === 1 ? "project" : "projects"} ·{" "}
                {counts.posts} {counts.posts === 1 ? "note" : "notes"}
              </motion.p>

              <h1 className="display display-wash text-[length:var(--step-name)]">
                {words.map((word, index) => (
                  <motion.span
                    key={word}
                    data-reveal
                    className="block"
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: TIMING.heroDelay + TIMING.blockStagger + index * TIMING.heroStagger,
                      ease: EASE,
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </h1>

              <motion.p
                className="display mt-8 text-[length:var(--step-tagline)] italic text-[var(--core)]"
                data-reveal
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay:
                    TIMING.heroDelay + TIMING.blockStagger + words.length * TIMING.heroStagger,
                  ease: EASE,
                }}
              >
                {tagline}
              </motion.p>

              <motion.p
                className="mt-5 max-w-md text-[var(--text-dim)]"
                data-reveal
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay:
                    TIMING.heroDelay +
                    TIMING.blockStagger * 2 +
                    words.length * TIMING.heroStagger,
                  ease: EASE,
                }}
              >
                {description}
              </motion.p>

              {/* The page had no controls at all before — every route was
                  reachable only from the nav or from links buried further down.
                  Two here: one filled primary, one quiet. */}
              <motion.div
                className="mt-11 flex flex-wrap items-center gap-3"
                data-reveal
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay:
                    TIMING.heroDelay +
                    TIMING.blockStagger * 3 +
                    words.length * TIMING.heroStagger,
                  ease: EASE,
                }}
              >
                <Link href="/projects" className="btn btn-primary" onMouseEnter={surgeTree}>
                  View work
                  <span aria-hidden="true">→</span>
                </Link>
                <a href={`mailto:${email}`} className="btn btn-ghost">
                  Get in touch
                </a>
              </motion.div>

              <motion.div
                className="mt-14 flex items-center gap-3"
                data-reveal
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay:
                    TIMING.heroDelay +
                    TIMING.blockStagger * 4 +
                    words.length * TIMING.heroStagger,
                  ease: EASE,
                }}
              >
                <span className="eyebrow text-[var(--text-faint)]">Scroll to climb</span>
                <motion.span
                  aria-hidden="true"
                  className="block h-px w-16 origin-left bg-gradient-to-r from-[var(--mid)] to-transparent"
                  animate={reduced ? undefined : { scaleX: [1, 0.4, 1] }}
                  transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity }}
                />
              </motion.div>
            </section>

            {/* ── Selected work ──────────────────────────────────────── */}
            <section aria-labelledby="featured-projects" className="py-20">
              <h2 id="featured-projects" className="sr-only">
                Selected work
              </h2>
              <Eyebrow>Selected work</Eyebrow>

              {projects.length === 0 ? (
                <p className="text-[var(--text-dim)]">No featured projects yet.</p>
              ) : (
                <ul className="border-l border-[var(--border)] pl-6">
                  {projects.map((project, index) => (
                    <ItemCard key={project.slug} item={project} index={index} />
                  ))}
                </ul>
              )}

              <div className="mt-8 pl-6">
                <TrailLink href="/projects">All projects →</TrailLink>
              </div>
            </section>

            {/* ── Recent writing ─────────────────────────────────────── */}
            <section aria-labelledby="recent-writing" className="py-20">
              <h2 id="recent-writing" className="sr-only">
                Recent writing
              </h2>
              <Eyebrow>Recent writing</Eyebrow>

              {posts.length === 0 ? (
                <p className="text-[var(--text-dim)]">No posts yet.</p>
              ) : (
                <ul className="border-l border-[var(--border)] pl-6">
                  {posts.map((post, index) => (
                    <ItemCard key={post.slug} item={post} index={index + projects.length} />
                  ))}
                </ul>
              )}

              <div className="mt-8 pl-6">
                <TrailLink href="/blog">All posts →</TrailLink>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
