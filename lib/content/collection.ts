import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import type { ZodType } from "zod";

export const CONTENT_DIR = path.join(process.cwd(), "content");

export type Entry<T> = {
  /** Filename without the `.mdx` extension. This is the URL segment. */
  slug: string;
  frontmatter: T;
  /** Raw MDX body, frontmatter stripped. */
  body: string;
  readingTimeMinutes: number;
};

const WORDS_PER_MINUTE = 220;

function estimateReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

async function listMdxFiles(collection: string): Promise<string[]> {
  const dir = path.join(CONTENT_DIR, collection);
  try {
    const names = await fs.readdir(dir);
    return names
      .filter((name) => name.endsWith(".mdx") && !name.startsWith("_"))
      .map((name) => path.join(dir, name));
  } catch (error) {
    // An empty collection is a valid state — the directory just isn't there yet.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/**
 * Builds a loader for one directory under `content/`. The returned function is
 * wrapped in React's `cache`, so a page that asks for the same collection twice
 * in one render only hits the filesystem once.
 */
export function createCollection<T>(collection: string, schema: ZodType<T>) {
  return cache(async (): Promise<Entry<T>[]> => {
    const files = await listMdxFiles(collection);

    return Promise.all(
      files.map(async (file) => {
        const raw = await fs.readFile(file, "utf8");
        const { data, content } = matter(raw);
        const parsed = schema.safeParse(data);

        if (!parsed.success) {
          const issues = parsed.error.issues
            .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
            .join("\n");
          throw new Error(
            `Invalid frontmatter in ${path.relative(process.cwd(), file)}:\n${issues}`,
          );
        }

        return {
          slug: path.basename(file, ".mdx"),
          frontmatter: parsed.data,
          body: content,
          readingTimeMinutes: estimateReadingTime(content),
        };
      }),
    );
  });
}

/** Drafts stay visible while running `next dev` and disappear from real builds. */
export const showDrafts = process.env.NODE_ENV !== "production";
