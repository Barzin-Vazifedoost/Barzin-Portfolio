import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Bough, BranchItem } from "@/components/branch";
import { PageShell } from "@/components/page-shell";
import { getPostTags, getPostsByTag } from "@/lib/content/posts";
import { formatDate, isoDate } from "@/lib/format";

type PageProps = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  const tags = await getPostTags();
  return tags.map((tag) => ({ tag: tag.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const result = await getPostsByTag(tagSlug);
  if (!result) return {};

  return {
    title: `Posts tagged “${result.tag.name}”`,
    description: `Writing tagged ${result.tag.name}.`,
    alternates: { canonical: `/blog/tags/${tagSlug}` },
  };
}

export default async function TagPage({ params }: PageProps) {
  const { tag: tagSlug } = await params;
  const result = await getPostsByTag(tagSlug);
  if (!result) notFound();

  const { tag, posts } = result;

  return (
    <PageShell
      eyebrow="Tagged"
      title={tag.name}
      lead={`Everything filed under ${tag.name}.`}
      aside={`${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
    >
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

      <div className="mt-12">
        <Link
          href="/blog"
          className="eyebrow group/link relative inline-block text-[var(--label)] transition-colors duration-500 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
        >
          ← All posts
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
          />
        </Link>
      </div>
    </PageShell>
  );
}
