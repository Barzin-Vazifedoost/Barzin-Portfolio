import HomeScene, { type SceneItem } from "@/components/home-scene";
import { PersonJsonLd } from "@/components/json-ld";
import { getFeaturedProjects, getProjects } from "@/lib/content/projects";
import { getPosts, getRecentPosts } from "@/lib/content/posts";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";

export default async function HomePage() {
  const [featured, recent, allProjects, allPosts] = await Promise.all([
    getFeaturedProjects(3),
    getRecentPosts(3),
    getProjects(),
    getPosts(),
  ]);

  // Entries are flattened to plain serializable objects here. Nothing from the
  // content layer crosses into the client scene.
  const projects: SceneItem[] = featured.map((project) => ({
    slug: project.slug,
    href: `/projects/${project.slug}`,
    title: project.frontmatter.title,
    summary: project.frontmatter.summary,
    meta: project.frontmatter.role ?? project.frontmatter.stack.slice(0, 3).join(" · "),
  }));

  const posts: SceneItem[] = recent.map((post) => ({
    slug: post.slug,
    href: `/blog/${post.slug}`,
    title: post.frontmatter.title,
    summary: post.frontmatter.summary,
    meta: `${formatDate(post.frontmatter.date)} · ${post.readingTimeMinutes} min`,
  }));

  // The tree itself — its shape, density and content anchors — is assembled
  // once in the root layout, so this page only describes itself.
  return (
    <>
      <PersonJsonLd />
      <HomeScene
        name={site.name}
        tagline={site.tagline}
        description={site.description}
        projects={projects}
        posts={posts}
        counts={{ projects: allProjects.length, posts: allPosts.length }}
      />
    </>
  );
}
