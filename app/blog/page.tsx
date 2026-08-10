import type { Metadata } from "next";
import Link from "next/link";
import { Bough, BranchItem, Leaf } from "@/components/branch";
import { PageShell } from "@/components/page-shell";
import { getPosts, getPostTags } from "@/lib/content/posts";
import { formatDate, isoDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes and long-form posts.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const [posts, tags] = await Promise.all([getPosts(), getPostTags()]);

  return (
    <PageShell
      eyebrow="Writing"
      title="Notes"
      lead="Things worth writing down — mostly engineering, occasionally process."
      aside={`${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
    >
      {tags.length > 0 ? (
        <nav aria-label="Tags" className="mb-12">
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.slug}>
                <Link
                  href={`/blog/tags/${tag.slug}`}
                  className="group/leaf inline-block transition-colors duration-500"
                >
                  <Leaf className="group-hover/leaf:border-[var(--mid)] group-hover/leaf:text-[var(--neon)]">
                    {tag.name}
                    <span className="ml-2 opacity-70">{tag.count}</span>
                  </Leaf>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {posts.length === 0 ? (
        <p className="text-[var(--text-dim)]">Nothing published yet.</p>
      ) : (
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
      )}
    </PageShell>
  );
}
