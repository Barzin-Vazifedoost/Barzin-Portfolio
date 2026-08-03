import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Reveal } from "@/components/reveal";
import { Spotlight } from "@/components/spotlight";
import { getProjects } from "@/lib/content/projects";
import { formatDate, isoDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Projects",
  description: "Case studies and selected work.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <PageShell
      eyebrow="Projects"
      title="Selected work"
      lead="Case studies, with the context and the outcome rather than just the stack."
      aside={`${projects.length} ${projects.length === 1 ? "entry" : "entries"}`}
    >
      {projects.length === 0 ? (
        <p className="text-[var(--text-dim)]">Nothing published yet.</p>
      ) : (
        /* Work gets cards rather than a timeline: a project is a thing with
           presence, and two columns let the stack and summary breathe. The
           writing index stays a chronological spine, which is the distinction
           between the two pages. */
        <ul className="grid gap-5 md:grid-cols-2">
          {projects.map(({ slug, frontmatter }, index) => (
            <Reveal as="li" key={slug} delay={index * 0.06} className="flex">
              <Spotlight className="group surface w-full">
                <Link
                  href={`/projects/${slug}`}
                  className="flex h-full flex-col p-6 sm:p-7"
                >
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="node" />
                    <time className="meta" dateTime={isoDate(frontmatter.date)}>
                      {formatDate(frontmatter.date, { year: "numeric", month: "short" })}
                    </time>
                    {frontmatter.featured ? (
                      <span className="eyebrow ml-auto text-[var(--mid)]">Featured</span>
                    ) : null}
                  </div>

                  <h2 className="display mt-5 text-[length:calc(var(--step-title)*1.08)] font-medium transition-colors duration-500 ease-[var(--ease-flow)] group-hover:text-[var(--core)]">
                    {frontmatter.title}
                  </h2>

                  {frontmatter.role ? (
                    <p className="meta mt-2.5">
                      {frontmatter.role}
                      {frontmatter.company ? (
                        <>
                          <span className="mx-2 text-[var(--deep)]">/</span>
                          {frontmatter.company}
                        </>
                      ) : null}
                    </p>
                  ) : null}

                  <p className="mt-4 text-[var(--text-dim)]">{frontmatter.summary}</p>

                  {frontmatter.stack.length > 0 ? (
                    <ul aria-label="Stack" className="mt-6 flex flex-wrap gap-2">
                      {frontmatter.stack.map((item) => (
                        <li key={item} className="pill">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {/* Pushed to the bottom edge so every card's call to action
                      lines up regardless of how long the summary runs. */}
                  <span className="eyebrow mt-auto flex items-center gap-2 pt-7 text-[var(--mid)] transition-colors duration-500 ease-[var(--ease-flow)] group-hover:text-[var(--neon)]">
                    Read case study
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-500 ease-[var(--ease-flow)] group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </Spotlight>
            </Reveal>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
