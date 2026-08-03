import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Mdx } from "@/components/mdx";
import { BackLink, PageShell } from "@/components/page-shell";
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
      <article className="prose-flow">
        <div className="mb-10 flex flex-wrap items-center gap-x-5 gap-y-3">
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
                  <Link href={`/blog/tags/${slugify(tag)}`} className="pill">
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Mdx source={body} />

        <BackLink href="/blog">All posts</BackLink>
      </article>
    </PageShell>
  );
}
