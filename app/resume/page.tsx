import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
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

/** Section heading with the same eyebrow motif used across the site. */
function SectionHead({ children }: { children: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="block h-1.5 w-1.5 rounded-full bg-[var(--neon)] shadow-[0_0_12px_var(--neon)]"
      />
      <h2 className="eyebrow">{children}</h2>
      <span
        aria-hidden="true"
        className="ml-2 block h-px flex-1 bg-gradient-to-r from-[var(--deep)] to-transparent"
      />
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
      <div className="mb-16 flex flex-wrap gap-x-6 gap-y-3">
        <a
          href={`mailto:${site.email}`}
          className="eyebrow group/link relative inline-block text-[var(--mid)] transition-colors duration-500 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
        >
          {site.email}
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
          />
        </a>
        {site.socials.map((social) => (
          <a
            key={social.href}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className="eyebrow group/link relative inline-block text-[var(--mid)] transition-colors duration-500 ease-[var(--ease-flow)] hover:text-[var(--neon)]"
          >
            {social.label} ↗
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
            />
          </a>
        ))}
        {resume.pdfPath ? (
          <a
            href={resume.pdfPath}
            download
            className="eyebrow group/link relative inline-block text-[var(--core)]"
          >
            Download PDF ↓
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
            />
          </a>
        ) : null}
      </div>

      <section aria-labelledby="experience" className="mb-20">
        <h2 id="experience" className="sr-only">
          Experience
        </h2>
        <SectionHead>Experience</SectionHead>

        <ol className="border-l border-[var(--deep)]/60">
          {experience.map((role) => (
            <li key={`${role.company}-${role.start}`} className="group relative py-8 pl-8">
              <span
                aria-hidden="true"
                className="absolute left-0 top-[42px] block h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--mid)] transition-all duration-500 ease-[var(--ease-flow)] group-hover:bg-[var(--neon)] group-hover:shadow-[0_0_14px_var(--neon)]"
              />

              <p className="meta">{dateRange(role.start, role.end)}</p>

              <h3 className="display mt-2 text-[length:var(--step-title)] font-medium">
                {role.role}
                <span className="text-[var(--text-faint)]"> — </span>
                <span className="text-[var(--core)]">{role.company}</span>
              </h3>

              {role.location ? (
                <p className="meta mt-1.5 text-[var(--text-faint)]">{role.location}</p>
              ) : null}

              {role.summary ? (
                <p className="mt-4 max-w-[62ch] text-[var(--text-dim)]">{role.summary}</p>
              ) : null}

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
                    <li
                      key={item}
                      className="meta rounded-full border border-[var(--deep)] px-3 py-1 text-[var(--text-faint)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="education" className="mb-20">
        <h2 id="education" className="sr-only">
          Education
        </h2>
        <SectionHead>Education</SectionHead>

        <ol className="border-l border-[var(--deep)]/60">
          {resume.education.map((entry) => (
            <li
              key={`${entry.institution}-${entry.credential}`}
              className="group relative py-8 pl-8"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-[42px] block h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--mid)] transition-all duration-500 ease-[var(--ease-flow)] group-hover:bg-[var(--neon)] group-hover:shadow-[0_0_14px_var(--neon)]"
              />

              {entry.start ? (
                <p className="meta">{dateRange(entry.start, entry.end)}</p>
              ) : null}

              <h3 className="display mt-2 text-[length:var(--step-title)] font-medium">
                {entry.credential}
                <span className="text-[var(--text-faint)]"> — </span>
                <span className="text-[var(--core)]">{entry.institution}</span>
              </h3>

              {entry.location ? (
                <p className="meta mt-1.5 text-[var(--text-faint)]">{entry.location}</p>
              ) : null}
              {entry.notes ? (
                <p className="mt-3 max-w-[62ch] text-[var(--text-dim)]">{entry.notes}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="skills">
        <h2 id="skills" className="sr-only">
          Skills
        </h2>
        <SectionHead>Skills</SectionHead>

        <dl className="grid gap-px overflow-hidden rounded-sm bg-[var(--deep)]/60 sm:grid-cols-2">
          {resume.skills.map((group) => (
            <div key={group.category} className="bg-[var(--bg)] p-6">
              <dt className="eyebrow text-[var(--text-faint)]">{group.category}</dt>
              <dd className="mt-3 text-[var(--text-dim)]">{group.items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PageShell>
  );
}
