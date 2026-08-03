import type { Metadata } from "next";
import Link from "next/link";
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
                  className="meta inline-block rounded-full border border-[var(--deep)] px-3 py-1 text-[var(--text-faint)] transition-all duration-500 ease-[var(--ease-flow)] hover:border-[var(--mid)] hover:text-[var(--neon)]"
                >
                  {tag.name}
                  <span className="ml-2 text-[var(--text-faint)]">{tag.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {posts.length === 0 ? (
        <p className="text-[var(--text-dim)]">Nothing published yet.</p>
      ) : (
        <ul className="border-l border-[var(--deep)]/60">
          {posts.map(({ slug, frontmatter, readingTimeMinutes }) => (
            <li key={slug} className="group relative">
              <Link
                href={`/blog/${slug}`}
                className="block py-8 pl-8 transition-colors duration-500 ease-[var(--ease-flow)] hover:bg-[var(--mid)]/[0.04]"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[42px] block h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--mid)] transition-all duration-500 ease-[var(--ease-flow)] group-hover:bg-[var(--neon)] group-hover:shadow-[0_0_14px_var(--neon)]"
                />

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
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
