import { z } from "zod";

/**
 * Frontmatter contracts for everything under `content/`. These are validated at
 * read time, so a typo in a .mdx file fails the build with a readable error
 * instead of rendering `undefined` somewhere on the page.
 */

const link = z.object({
  label: z.string().min(1),
  /** Absolute or root-relative. */
  href: z.string().min(1),
});

/**
 * YAML turns an unquoted `2026-05-20` into a Date, but a typo turns it into a
 * string (or an Invalid Date). Accept both and report the offending value,
 * which `z.coerce.date()` on its own does not do legibly.
 */
const contentDate = z.union([z.date(), z.string(), z.number()]).transform((value, ctx) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: "custom",
      message: `Invalid date ${JSON.stringify(value)} — use YYYY-MM-DD.`,
    });
    return z.NEVER;
  }
  return date;
});

export const projectFrontmatterSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  /** Ship / completion date. Drives sorting when `order` ties. */
  date: contentDate,
  role: z.string().optional(),
  company: z.string().optional(),
  /** Technologies used — free-form, rendered as a list. */
  stack: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  links: z.array(link).default([]),
  /** Surfaced on the home page. */
  featured: z.boolean().default(false),
  /** Manual sort key, ascending. Lower shows first. */
  order: z.number().int().default(0),
  /** Hidden in production builds, visible in `next dev`. */
  draft: z.boolean().default(false),
});

export const postFrontmatterSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  date: contentDate,
  updated: contentDate.optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

export type ProjectFrontmatter = z.infer<typeof projectFrontmatterSchema>;
export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

/** Resume data is authored as TypeScript, so the compiler is the validator. */
export type ResumeExperience = {
  company: string;
  role: string;
  /** `YYYY-MM`. */
  start: string;
  /** `YYYY-MM`, or omitted for a current role. */
  end?: string;
  location?: string;
  summary?: string;
  highlights: string[];
  stack?: string[];
};

export type ResumeEducation = {
  institution: string;
  credential: string;
  start?: string;
  end?: string;
  location?: string;
  notes?: string;
};

export type ResumeSkillGroup = {
  category: string;
  items: string[];
};

export type Resume = {
  headline: string;
  summary: string;
  location?: string;
  /** Path under `public/`, e.g. `/barzin-vazifedoost-resume.pdf`. */
  pdfPath?: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: ResumeSkillGroup[];
};
