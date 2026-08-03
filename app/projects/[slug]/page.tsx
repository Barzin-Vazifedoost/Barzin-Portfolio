import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Mdx } from "@/components/mdx";
import { PageShell } from "@/components/page-shell";
import { getProject, getProjectSlugs } from "@/lib/content/projects";
import { formatDate, isoDate } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};

  const { title, summary, date } = project.frontmatter;
  return {
    title,
    description: summary,
    alternates: { canonical: `/projects/${slug}` },
    openGraph: {
      type: "article",
      title,
      description: summary,
      url: `/projects/${slug}`,
      publishedTime: date.toISOString(),
    },
  };
}

/** One row of the project fact table. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[var(--deep)]/60 py-3">
      <dt className="eyebrow text-[var(--text-faint)]">{label}</dt>
      <dd className="mt-1.5 text-[var(--text-dim)]">{value}</dd>
    </div>
  );
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const { frontmatter, body } = project;

  return (
    <PageShell
      eyebrow="Case study"
      title={frontmatter.title}
      lead={frontmatter.summary}
      aside={formatDate(frontmatter.date, { year: "numeric", month: "short" })}
    >
      <article className="lg:grid lg:grid-cols-[1fr_minmax(0,15rem)] lg:gap-16">
        <div className="max-w-[68ch] lg:order-1">
          <Mdx source={body} />

          <footer className="mt-20 border-t border-[var(--deep)]/60 pt-8">
            <Link
              href="/projects"
              className="eyebrow group/link relative inline-block text-[var(--mid)] transition-colors duration-500 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
            >
              ← All projects
              <span
                aria-hidden="true"
                className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
              />
            </Link>
          </footer>
        </div>

        {/* Facts rail: sits alongside on desktop, above the body on mobile. */}
        <aside className="mb-14 lg:order-2 lg:mb-0">
          <dl>
            <Fact
              label="Date"
              value={formatDate(frontmatter.date)}
            />
            {frontmatter.role ? <Fact label="Role" value={frontmatter.role} /> : null}
            {frontmatter.company ? (
              <Fact label="Company" value={frontmatter.company} />
            ) : null}
            {frontmatter.stack.length > 0 ? (
              <Fact label="Stack" value={frontmatter.stack.join(", ")} />
            ) : null}
          </dl>

          {frontmatter.links.length > 0 ? (
            <ul aria-label="Project links" className="mt-8 flex flex-col gap-3">
              {frontmatter.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eyebrow group/link relative inline-block text-[var(--mid)] transition-colors duration-500 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
                  >
                    {link.label} ↗
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="meta mt-8 text-[var(--text-faint)]">
            <time dateTime={isoDate(frontmatter.date)}>{isoDate(frontmatter.date)}</time>
          </p>
        </aside>
      </article>
    </PageShell>
  );
}
