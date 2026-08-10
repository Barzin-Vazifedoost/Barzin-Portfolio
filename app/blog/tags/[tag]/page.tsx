import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import PostList from "@/components/post-list";
import QuietLink from "@/components/quiet-link";
import { getPostTags, getPostsByTag } from "@/lib/content/posts";

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
      <PostList posts={posts} empty={`Nothing filed under ${tag.name} yet.`} />

      <div className="mt-12">
        <QuietLink href="/blog">← All posts</QuietLink>
      </div>
    </PageShell>
  );
}
