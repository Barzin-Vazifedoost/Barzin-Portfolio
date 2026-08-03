import "server-only";

import { cache } from "react";
import { createCollection, showDrafts, type Entry } from "@/lib/content/collection";
import { postFrontmatterSchema, type PostFrontmatter } from "@/lib/content/schemas";
import { slugify } from "@/lib/slugify";

export type Post = Entry<PostFrontmatter>;

const loadAll = createCollection("blog", postFrontmatterSchema);

/** Published posts, newest first. */
export const getPosts = cache(async (): Promise<Post[]> => {
  const all = await loadAll();
  return all
    .filter((post) => showDrafts || !post.frontmatter.draft)
    .sort((a, b) => b.frontmatter.date.getTime() - a.frontmatter.date.getTime());
});

export async function getRecentPosts(limit: number): Promise<Post[]> {
  return (await getPosts()).slice(0, limit);
}

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await getPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getPostSlugs(): Promise<string[]> {
  return (await getPosts()).map((post) => post.slug);
}

export type PostTag = { name: string; slug: string; count: number };

export async function getPostTags(): Promise<PostTag[]> {
  const counts = new Map<string, PostTag>();

  for (const post of await getPosts()) {
    for (const name of post.frontmatter.tags) {
      const slug = slugify(name);
      const existing = counts.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(slug, { name, slug, count: 1 });
      }
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getPostsByTag(tagSlug: string): Promise<{ tag: PostTag; posts: Post[] } | null> {
  const tag = (await getPostTags()).find((candidate) => candidate.slug === tagSlug);
  if (!tag) return null;

  const posts = (await getPosts()).filter((post) =>
    post.frontmatter.tags.some((name) => slugify(name) === tagSlug),
  );

  return { tag, posts };
}
