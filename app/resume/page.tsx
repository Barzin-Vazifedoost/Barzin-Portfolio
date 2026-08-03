import type { Metadata } from "next";
import { PageShell, SectionHead } from "@/components/page-shell";
import { Reveal } from "@/components/reveal";
import { Spotlight } from "@/components/spotlight";
import { getExperience, getResume, parseResumeMonth } from "@/lib/content/resume";
import { formatMonthYear } from "@/lib/format";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Resume",
  description: `Experience, education and skills for ${site.name}.`,
  alternates: { canonical: "/resume" },
};

function dateRange(start: string, end?: string): string {
  const from = formatMonthYear(parseResumeMonth(start));
  const to = end ? formatMonthYear(parseResumeMonth(end)) : "Present";
  return `${from} — ${to}`;
}

/** A contact or download link in the mono voice. */
function ContactLink({
  href,
  children,
  emphasis = false,
  download = false,
}: {
  href: string;
  children: string;
  /** The primary action — the PDF — reads brighter than the rest. */
  emphasis?: boolean;
  download?: boolean;
}) {
  const external = href.startsWith("http");

  return (
    <a
      href={href}
      {...(download ? { download: true } : {})}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`eyebrow underline-draw inline-block transition-colors duration-400 ease-[var(--ease-flow)] hover:text-[var(--neon)] ${
        emphasis ? "text-[var(--core)]" : "text-[var(--mid)]"
      }`}
    >
      {children}
    </a>
  );
}

/**
 * A dated entry on the resume spine — one shape for both roles and degrees,
 * since they carry the same fields in a different order.
 */
function TimelineEntry({
  period,
  title,
  affiliation,
  location,
  summary,
  children,
}: {
  period?: string;
  title: string;
  affiliation: string;
  location?: string;
  summary?: string;
  children?: React.ReactNode;
}) {
  return (
    <Spotlight className="group rounded-[var(--radius)]">
      <div className="rounded-[var(--radius)] py-7 pl-8 pr-6 transition-colors duration-500 ease-[var(--ease-flow)] group-hover:bg-[var(--surface)]">
        <span aria-hidden="true" className="node absolute left-0 top-[38px]" />

        {period ? <p className="meta">{period}</p> : null}

        <h3 className="display mt-2.5 text-[length:var(--step-title)] font-medium">
          {title}
          <span className="text-[var(--text-faint)]"> — </span>
          <span className="text-[var(--core)]">{affiliation}</span>
        </h3>

        {location ? (
          <p className="meta mt-2 text-[var(--text-faint)]">{location}</p>
        ) : null}

        {summary ? (
          <p className="mt-4 max-w-[62ch] text-[var(--text-dim)]">{summary}</p>
        ) : null}

        {children}
      </div>
    </Spotlight>
  );
}

/** The shared spine behind a run of timeline entries. */
function Spine({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-[3px] top-6 w-px bg-gradient-to-b from-[var(--border-strong)] via-[var(--border)] to-transparent"
      />
      {children}
    </div>
  );
}

export default function ResumePage() {
  const resume = getResume();
  const experience = getExperience();

  return (
    <PageShell
      eyebrow="Resume"
      title={resume.headline}
      lead={resume.summary}
      aside={resume.location}
    >
      <Reveal className="mb-14 flex flex-wrap gap-x-7 gap-y-3">
        <ContactLink href={`mailto:${site.email}`}>{site.email}</ContactLink>
        {site.socials.map((social) => (
          <ContactLink key={social.href} href={social.href}>
            {`${social.label} ↗`}
          </ContactLink>
        ))}
        {resume.pdfPath ? (
          <ContactLink href={resume.pdfPath} download emphasis>
            Download PDF ↓
          </ContactLink>
        ) : null}
      </Reveal>

      <section aria-labelledby="experience" className="mb-20">
        <h2 id="experience" className="sr-only">
          Experience
        </h2>
        <SectionHead>Experience</SectionHead>

        <Spine>
          <ol>
            {experience.map((role, index) => (
              <Reveal as="li" key={`${role.company}-${role.start}`} delay={index * 0.05}>
                <TimelineEntry
                  period={dateRange(role.start, role.end)}
                  title={role.role}
                  affiliation={role.company}
                  location={role.location}
                  summary={role.summary}
                >
                  {role.highlights.length > 0 ? (
                    <ul className="mt-4 flex flex-col gap-2">
                      {role.highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="relative max-w-[62ch] pl-5 text-[var(--text-dim)] before:absolute before:left-0 before:top-[0.7em] before:block before:h-1 before:w-1 before:rounded-full before:bg-[var(--mid)]"
                        >
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {role.stack && role.stack.length > 0 ? (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {role.stack.map((item) => (
                        <li key={item} className="pill">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </TimelineEntry>
              </Reveal>
            ))}
          </ol>
        </Spine>
      </section>

      <section aria-labelledby="education" className="mb-20">
        <h2 id="education" className="sr-only">
          Education
        </h2>
        <SectionHead>Education</SectionHead>

        <Spine>
          <ol>
            {resume.education.map((entry, index) => (
              <Reveal
                as="li"
                key={`${entry.institution}-${entry.credential}`}
                delay={index * 0.05}
              >
                <TimelineEntry
                  period={entry.start ? dateRange(entry.start, entry.end) : undefined}
                  title={entry.credential}
                  affiliation={entry.institution}
                  location={entry.location}
                  summary={entry.notes}
                />
              </Reveal>
            ))}
          </ol>
        </Spine>
      </section>

      <section aria-labelledby="skills">
        <h2 id="skills" className="sr-only">
          Skills
        </h2>
        <SectionHead>Skills</SectionHead>

        {/* A hairline grid: one panel treatment, divided by its own gaps, so
            there is no double border where two cells meet. */}
        <Reveal>
          <dl className="surface grid gap-px overflow-hidden bg-[var(--border)] sm:grid-cols-2">
            {resume.skills.map((group) => (
              <div key={group.category} className="bg-[var(--bg)] p-6">
                <dt className="eyebrow text-[var(--text-faint)]">{group.category}</dt>
                <dd className="mt-3 text-[var(--text-dim)]">{group.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>
    </PageShell>
  );
}
