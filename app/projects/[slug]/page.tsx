import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mdx } from "@/components/mdx";
import { BackLink, PageShell } from "@/components/page-shell";
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
    <div className="border-t border-[var(--border)] px-5 py-4 first:border-t-0">
      <dt className="eyebrow text-[var(--text-faint)]">{label}</dt>
      <dd className="mt-2 text-[0.94em] text-[var(--text-dim)]">{value}</dd>
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
      <article className="lg:grid lg:grid-cols-[1fr_minmax(0,16rem)] lg:gap-16">
        <div className="prose-flow max-w-[68ch] lg:order-1">
          <Mdx source={body} />

          <BackLink href="/projects">All projects</BackLink>
        </div>

        {/* Facts rail: sits alongside on desktop, above the body on mobile.
            Sticky on desktop, so the stack stays readable while the case study
            scrolls past it. */}
        <aside className="mb-14 lg:order-2 lg:mb-0 lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start">
          <dl className="surface overflow-hidden">
            <Fact label="Date" value={formatDate(frontmatter.date)} />
            {frontmatter.role ? <Fact label="Role" value={frontmatter.role} /> : null}
            {frontmatter.company ? (
              <Fact label="Company" value={frontmatter.company} />
            ) : null}
            {frontmatter.stack.length > 0 ? (
              <Fact label="Stack" value={frontmatter.stack.join(", ")} />
            ) : null}
          </dl>

          {frontmatter.links.length > 0 ? (
            <ul aria-label="Project links" className="mt-7 flex flex-col gap-3.5 px-1">
              {frontmatter.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eyebrow underline-draw group/ext inline-flex items-center gap-2 text-[var(--mid)] transition-colors duration-400 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-400 ease-[var(--ease-flow)] group-hover/ext:-translate-y-0.5 group-hover/ext:translate-x-0.5"
                    >
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="meta mt-7 px-1 text-[var(--text-faint)]">
            <time dateTime={isoDate(frontmatter.date)}>{isoDate(frontmatter.date)}</time>
          </p>
        </aside>
      </article>
    </PageShell>
  );
}
