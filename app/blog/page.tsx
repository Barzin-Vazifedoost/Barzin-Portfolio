import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { PostTimeline } from "@/components/post-timeline";
import { Reveal } from "@/components/reveal";
import { getPosts, getPostTags } from "@/lib/content/posts";

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
        <Reveal>
          <nav aria-label="Tags" className="mb-10">
            <ul className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag.slug}>
                  <Link href={`/blog/tags/${tag.slug}`} className="pill">
                    {tag.name}
                    <span className="ml-2 text-[var(--mid)]">{tag.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Reveal>
      ) : null}

      {posts.length === 0 ? (
        <p className="text-[var(--text-dim)]">Nothing published yet.</p>
      ) : (
        <PostTimeline posts={posts} />
      )}
    </PageShell>
  );
}
