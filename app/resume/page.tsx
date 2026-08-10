import type { Metadata } from "next";
import { Bough, BranchHeading, BranchItem, Leaf } from "@/components/branch";
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

export default function ResumePage() {
  const resume = getResume();
  const experience = getExperience();

  return (
    <PageShell
      eyebrow="Roots"
      title={resume.headline}
      lead={resume.summary}
      aside={resume.location}
      // The resume is the root system: the half of the tree the rest grew out
      // of. It gets its own light, because it is not the canopy.
      register="roots"
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
        <BranchHeading>Experience</BranchHeading>

        <Bough as="ol" register="roots">
          {experience.map((role, index) => (
            <BranchItem
              key={`${role.company}-${role.start}`}
              index={index}
              total={experience.length}
              register="roots"
              className="py-8 pl-10"
            >
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
                    <li key={item}>
                      <Leaf>{item}</Leaf>
                    </li>
                  ))}
                </ul>
              ) : null}
            </BranchItem>
          ))}
        </Bough>
      </section>

      <section aria-labelledby="education" className="mb-20">
        <h2 id="education" className="sr-only">
          Education
        </h2>
        <BranchHeading>Education</BranchHeading>

        <Bough as="ol" register="roots">
          {resume.education.map((entry, index) => (
            <BranchItem
              key={`${entry.institution}-${entry.credential}`}
              index={index}
              total={resume.education.length}
              register="roots"
              className="py-8 pl-10"
            >
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
            </BranchItem>
          ))}
        </Bough>
      </section>

      <section aria-labelledby="skills">
        <h2 id="skills" className="sr-only">
          Skills
        </h2>
        <BranchHeading>Skills</BranchHeading>

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
