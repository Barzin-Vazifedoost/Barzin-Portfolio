import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { Spotlight } from "@/components/spotlight";
import type { Post } from "@/lib/content/posts";
import { formatDate, isoDate } from "@/lib/format";

/**
 * The writing list: a chronological spine with a node per post. Shared by the
 * blog index and every tag page, which previously carried two copies of the
 * same markup.
 *
 * Server component — the entries carry their raw MDX `body`, and handing that
 * across a client boundary would put every post's full text into the RSC
 * payload for a page that only renders titles.
 */
export function PostTimeline({ posts }: { posts: Post[] }) {
  return (
    <div className="relative">
      {/* The spine. Aligned to the centre of the nodes, and fading out at the
          bottom so the list ends rather than being cut off. */}
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-[3px] top-6 w-px bg-gradient-to-b from-[var(--border-strong)] via-[var(--border)] to-transparent"
      />

      <ul>
        {posts.map(({ slug, frontmatter, readingTimeMinutes }, index) => (
          <Reveal as="li" key={slug} delay={index * 0.05}>
            <Spotlight className="group rounded-[var(--radius)]">
              <Link
                href={`/blog/${slug}`}
                className="block rounded-[var(--radius)] py-7 pl-8 pr-6 transition-colors duration-500 ease-[var(--ease-flow)] hover:bg-[var(--surface)]"
              >
                <span
                  aria-hidden="true"
                  className="node absolute left-0 top-[38px]"
                />

                <p className="meta flex flex-wrap items-center gap-x-2">
                  <time dateTime={isoDate(frontmatter.date)}>
                    {formatDate(frontmatter.date)}
                  </time>
                  <span className="text-[var(--deep)]">/</span>
                  <span>{readingTimeMinutes} min</span>
                </p>

                <h2 className="display mt-3 text-[length:var(--step-title)] font-medium transition-colors duration-500 ease-[var(--ease-flow)] group-hover:text-[var(--core)]">
                  {frontmatter.title}
                </h2>

                <p className="mt-3 max-w-[62ch] text-[var(--text-dim)]">
                  {frontmatter.summary}
                </p>

                {frontmatter.tags.length > 0 ? (
                  <p className="meta mt-4 flex flex-wrap gap-x-3 text-[var(--text-faint)]">
                    {frontmatter.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </p>
                ) : null}
              </Link>
            </Spotlight>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
