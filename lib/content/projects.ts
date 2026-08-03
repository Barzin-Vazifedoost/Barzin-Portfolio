import "server-only";

import { cache } from "react";
import { createCollection, showDrafts, type Entry } from "@/lib/content/collection";
import { projectFrontmatterSchema, type ProjectFrontmatter } from "@/lib/content/schemas";
import { slugify } from "@/lib/slugify";

export type Project = Entry<ProjectFrontmatter>;

const loadAll = createCollection("projects", projectFrontmatterSchema);

/** Published projects, sorted by manual `order` then newest first. */
export const getProjects = cache(async (): Promise<Project[]> => {
  const all = await loadAll();
  return all
    .filter((project) => showDrafts || !project.frontmatter.draft)
    .sort((a, b) => {
      if (a.frontmatter.order !== b.frontmatter.order) {
        return a.frontmatter.order - b.frontmatter.order;
      }
      return b.frontmatter.date.getTime() - a.frontmatter.date.getTime();
    });
});

export async function getFeaturedProjects(limit?: number): Promise<Project[]> {
  const projects = (await getProjects()).filter((project) => project.frontmatter.featured);
  return typeof limit === "number" ? projects.slice(0, limit) : projects;
}

export async function getProject(slug: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find((project) => project.slug === slug) ?? null;
}

export async function getProjectSlugs(): Promise<string[]> {
  return (await getProjects()).map((project) => project.slug);
}

export type ProjectTag = { name: string; slug: string; count: number };

export async function getProjectTags(): Promise<ProjectTag[]> {
  const counts = new Map<string, ProjectTag>();

  for (const project of await getProjects()) {
    for (const name of project.frontmatter.tags) {
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
