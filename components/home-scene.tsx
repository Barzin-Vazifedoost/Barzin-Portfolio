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
        className="block h-1.5 w-1.5 rounded-full bg-[var(--neon)]"
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.6, ease: EASE }}
        style={{ boxShadow: "0 0 12px var(--neon)" }}
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
        className="ml-2 block h-px flex-1 origin-left bg-gradient-to-r from-[var(--deep)] to-transparent"
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
      <span
        aria-hidden="true"
        className="absolute -left-[21px] top-[38px] block h-1.5 w-1.5 rounded-full bg-[var(--mid)] transition-all duration-500 ease-[var(--ease-flow)] group-hover:bg-[var(--neon)] group-hover:shadow-[0_0_14px_var(--neon)]"
      />

      <h3 className="display text-[length:var(--step-title)] font-medium">
        <Link href={item.href} className="relative inline-block text-[var(--text)]">
          <span className="transition-colors duration-500 ease-[var(--ease-flow)] group-hover:text-[var(--core)]">
            {item.title}
          </span>
          {/* Tendril-underline: draws itself from the left on hover. */}
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-[var(--neon)] to-transparent transition-transform duration-700 ease-[var(--ease-flow)] group-hover:scale-x-100"
          />
        </Link>
      </h3>

      {item.meta ? <p className="meta mt-2">{item.meta}</p> : null}
      <p className="mt-3 max-w-prose text-[var(--text-dim)]">{item.summary}</p>
    </motion.li>
  );
}

/** Quiet mono link with the same drawing underline as item titles. */
function TrailLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="eyebrow group/link relative inline-block text-[var(--mid)]">
      <span className="transition-colors duration-500 ease-[var(--ease-flow)] group-hover/link:text-[var(--neon)]">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
      />
    </Link>
  );
}

export default function HomeScene({
  name,
  tagline,
  description,
  projects,
  posts,
  counts,
  density,
}: HomeSceneProps) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  // The spine fills as you climb — scroll made literal.
  const spine = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const words = name.split(" ");

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: TIMING.reveal, ease: EASE }}>
      {/*
        Entrance animations render their `initial` state into the prerendered
        HTML, so without JS every revealed element would stay at opacity 0.
        This puts the content back for non-JS clients.
      */}
      <noscript>
        <style>{`[data-reveal]{opacity:1 !important;transform:none !important;}`}</style>
      </noscript>

      <GrowthTree density={density} />

      {/* Legibility scrim: keeps branches from fighting the words. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 z-[1] w-full lg:w-[62%]"
        style={{
          background:
            "linear-gradient(100deg, rgba(5,8,5,0.94) 0%, rgba(5,8,5,0.88) 38%, rgba(5,8,5,0.55) 66%, rgba(5,8,5,0) 100%)",
        }}
      />

      {/* Climb indicator, pinned to the left edge of the column. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-6 top-0 z-[2] hidden h-full w-px bg-[var(--deep)]/40 sm:left-10 lg:block"
      >
        <motion.div
          className="h-full w-full origin-top bg-gradient-to-b from-[var(--neon)] via-[var(--mid)] to-transparent"
          style={reduced ? undefined : { scaleY: spine, willChange: "transform" }}
        />
      </div>

      <div data-tree-ignore className="relative z-10 px-6 sm:px-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,46%)_1fr]">
          <div>
            {/* ── Hero ───────────────────────────────────────────────── */}
            <section className="flex min-h-[82vh] flex-col justify-center py-16">
              <motion.p
                className="eyebrow mb-8"
                data-reveal
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: TIMING.heroDelay, ease: EASE }}
              >
                {counts.projects} {counts.projects === 1 ? "project" : "projects"} ·{" "}
                {counts.posts} {counts.posts === 1 ? "note" : "notes"}
              </motion.p>

              <h1 className="display text-[length:var(--step-hero)]">
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

              <motion.div
                className="mt-16 flex items-center gap-3"
                data-reveal
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay:
                    TIMING.heroDelay +
                    TIMING.blockStagger * 3 +
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
                <ul className="border-l border-[var(--deep)]/60 pl-6">
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
                <ul className="border-l border-[var(--deep)]/60 pl-6">
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
