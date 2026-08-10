import Link from "next/link";

import { Bough, BranchItem } from "@/components/branch";
import type { Post } from "@/lib/content/posts";
import { formatDate, isoDate } from "@/lib/format";

/**
 * The list of posts, as a bough.
 *
 * `/blog` and `/blog/tags/[tag]` rendered this same markup character for
 * character — same wrapper, same heading, same meta line, same summary — so
 * every change to how a post reads in a list had to be made twice and stayed
 * consistent by luck.
 */

export default function PostList({
  posts,
  empty = "Nothing published yet.",
}: {
  /** Straight from the content layer — the shape is not restated here. */
  posts: readonly Post[];
  empty?: string;
}) {
  if (posts.length === 0) {
    return <p className="text-[var(--text-dim)]">{empty}</p>;
  }

  return (
    <Bough>
      {posts.map(({ slug, frontmatter, readingTimeMinutes }, index) => (
        <BranchItem key={slug} index={index} total={posts.length}>
          <Link
            href={`/blog/${slug}`}
            className="block py-8 pl-10 transition-colors duration-500 ease-[var(--ease-flow)] hover:bg-[var(--mid)]/[0.04]"
          >
            <h2 className="display text-[length:var(--step-title)] font-medium transition-colors duration-500 ease-[var(--ease-flow)] group-hover:text-[var(--core)]">
              {frontmatter.title}
            </h2>

            <p className="meta mt-2">
              <time dateTime={isoDate(frontmatter.date)}>
                {formatDate(frontmatter.date)}
              </time>
              <span className="mx-2 text-[var(--deep)]">/</span>
              {readingTimeMinutes} min
            </p>

            <p className="mt-3 max-w-[60ch] text-[var(--text-dim)]">
              {frontmatter.summary}
            </p>
          </Link>
        </BranchItem>
      ))}
    </Bough>
  );
}
