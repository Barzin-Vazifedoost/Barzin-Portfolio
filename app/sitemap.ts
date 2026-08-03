import type { MetadataRoute } from "next";
import { getPostTags, getPosts } from "@/lib/content/posts";
import { getProjects } from "@/lib/content/projects";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts, tags] = await Promise.all([
    getProjects(),
    getPosts(),
    getPostTags(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/projects"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/resume"), changeFrequency: "yearly", priority: 0.6 },
  ];

  return [
    ...staticRoutes,
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: project.frontmatter.date,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.frontmatter.updated ?? post.frontmatter.date,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...tags.map((tag) => ({
      url: absoluteUrl(`/blog/tags/${tag.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
