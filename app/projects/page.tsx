import type { Metadata } from "next";
import Link from "next/link";
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
        <ul className="border-l border-[var(--deep)]/60">
          {projects.map(({ slug, frontmatter }) => (
            <li key={slug} className="group relative">
              <Link
                href={`/projects/${slug}`}
                className="block py-8 pl-8 transition-colors duration-500 ease-[var(--ease-flow)] hover:bg-[var(--mid)]/[0.04]"
              >
                {/* Node on the spine. */}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[42px] block h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--mid)] transition-all duration-500 ease-[var(--ease-flow)] group-hover:bg-[var(--neon)] group-hover:shadow-[0_0_14px_var(--neon)]"
                />

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
                      <li
                        key={item}
                        className="meta rounded-full border border-[var(--deep)] px-3 py-1 text-[var(--text-faint)] transition-colors duration-500 ease-[var(--ease-flow)] group-hover:border-[var(--mid)]/60"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
