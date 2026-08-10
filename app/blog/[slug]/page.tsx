import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BlogPostingJsonLd } from "@/components/json-ld";
import { Mdx } from "@/components/mdx";
import { PageShell } from "@/components/page-shell";
import QuietLink from "@/components/quiet-link";
import { getPost, getPostSlugs } from "@/lib/content/posts";
import { formatDate, isoDate } from "@/lib/format";
import { slugify } from "@/lib/slugify";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const { title, summary, date, updated, tags } = post.frontmatter;
  return {
    title,
    description: summary,
    keywords: tags,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title,
      description: summary,
      url: `/blog/${slug}`,
      publishedTime: date.toISOString(),
      modifiedTime: updated?.toISOString(),
      tags,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { frontmatter, body, readingTimeMinutes } = post;

  return (
    <PageShell
      eyebrow="Writing"
      title={frontmatter.title}
      lead={frontmatter.summary}
      width="prose"
      aside={`${readingTimeMinutes} min`}
    >
      <BlogPostingJsonLd
        title={frontmatter.title}
        description={frontmatter.summary}
        slug={slug}
        published={frontmatter.date}
        modified={frontmatter.updated}
        tags={frontmatter.tags}
      />
      <article>
        <div className="mb-12 flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="meta">
            <time dateTime={isoDate(frontmatter.date)}>{formatDate(frontmatter.date)}</time>
            {frontmatter.updated ? (
              <>
                <span className="mx-2 text-[var(--deep)]">/</span>
                Updated{" "}
                <time dateTime={isoDate(frontmatter.updated)}>
                  {formatDate(frontmatter.updated)}
                </time>
              </>
            ) : null}
          </p>

          {frontmatter.tags.length > 0 ? (
            <ul aria-label="Tags" className="flex flex-wrap gap-2">
              {frontmatter.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/blog/tags/${slugify(tag)}`}
                    className="meta inline-block rounded-full border border-[var(--deep)] px-3 py-1 text-[var(--text-faint)] transition-all duration-500 ease-[var(--ease-flow)] hover:border-[var(--mid)] hover:text-[var(--neon)]"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Mdx source={body} />

        <footer className="mt-20 border-t border-[var(--deep)]/60 pt-8">
          <QuietLink href="/blog">← All posts</QuietLink>
        </footer>
      </article>
    </PageShell>
  );
}
