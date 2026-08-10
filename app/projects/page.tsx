import type { Metadata } from "next";
import Link from "next/link";
import { Bough, BranchItem, Leaf } from "@/components/branch";
import { PageShell } from "@/components/page-shell";
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
        <Bough>
          {projects.map(({ slug, frontmatter }, index) => (
            <BranchItem key={slug} index={index} total={projects.length}>
              <Link
                href={`/projects/${slug}`}
                className="block py-8 pl-10 transition-colors duration-500 ease-[var(--ease-flow)] hover:bg-[var(--mid)]/[0.04]"
              >
                <div className="flex flex-wrap items-baseline gap-x-4">
                  <h2 className="display text-[length:var(--step-title)] font-medium transition-colors duration-500 ease-[var(--ease-flow)] group-hover:text-[var(--core)]">
                    {frontmatter.title}
                  </h2>
                  <time className="meta" dateTime={isoDate(frontmatter.date)}>
                    {formatDate(frontmatter.date, { year: "numeric", month: "short" })}
                  </time>
                </div>

                {frontmatter.role ? (
                  <p className="meta mt-2">{frontmatter.role}</p>
                ) : null}

                <p className="mt-3 max-w-[60ch] text-[var(--text-dim)]">
                  {frontmatter.summary}
                </p>

                {frontmatter.stack.length > 0 ? (
                  <ul aria-label="Stack" className="mt-4 flex flex-wrap gap-2">
                    {frontmatter.stack.map((item) => (
                      <li key={item}>
                        <Leaf className="group-hover:border-[var(--mid)]/60">{item}</Leaf>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Link>
            </BranchItem>
          ))}
        </Bough>
      )}
    </PageShell>
  );
}
