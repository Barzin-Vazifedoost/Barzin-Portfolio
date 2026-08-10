import type { Metadata } from "next";
import Link from "next/link";
import { Leaf } from "@/components/branch";
import { PageShell } from "@/components/page-shell";
import PostList from "@/components/post-list";
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

      <PostList posts={posts} />
    </PageShell>
  );
}
