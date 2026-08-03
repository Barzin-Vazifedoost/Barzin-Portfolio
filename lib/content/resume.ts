import { resume } from "@/content/resume";
import type { Resume, ResumeExperience } from "@/lib/content/schemas";

export type { Resume, ResumeExperience };

export function getResume(): Resume {
  return resume;
}

/** Parses a `YYYY-MM` string into a UTC Date pinned to the first of the month. */
export function parseResumeMonth(value: string): Date {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    throw new Error(`Invalid resume date "${value}" — expected YYYY-MM.`);
  }
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Experience newest first, so the data file can stay in whatever order you like. */
export function getExperience(): ResumeExperience[] {
  return [...resume.experience].sort(
    (a, b) => parseResumeMonth(b.start).getTime() - parseResumeMonth(a.start).getTime(),
  );
}
