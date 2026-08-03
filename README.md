# Barzin Portfolio

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · MDX content.

Scaffolding only — the functionality is wired up and verified, the visual design
is deliberately not. Every page renders semantic, unstyled HTML.

## Getting started

```bash
cp .env.example .env.local   # then set NEXT_PUBLIC_SITE_URL
npm install
npm run dev                  # http://localhost:3000
```

| Script              | Does                                              |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Dev server. Drafts are visible.                   |
| `npm run build`     | Production build. Fails on invalid frontmatter.   |
| `npm run start`     | Serve the production build.                       |
| `npm run typecheck` | `tsc --noEmit`                                    |
| `npm run lint`      | ESLint (`npm run lint:fix` to autofix)            |

## Routes

| Route              | Rendering | Source                    |
| ------------------ | --------- | ------------------------- |
| `/`                | Static    | Featured projects + recent posts |
| `/projects`        | Static    | `content/projects/*.mdx`  |
| `/projects/[slug]` | SSG       | `content/projects/*.mdx`  |
| `/blog`            | Static    | `content/blog/*.mdx`      |
| `/blog/[slug]`     | SSG       | `content/blog/*.mdx`      |
| `/blog/tags/[tag]` | SSG       | Derived from post tags    |
| `/resume`          | Static    | `content/resume.ts`       |
| `/sitemap.xml`     | Static    | Generated from content    |
| `/robots.txt`      | Static    | `app/robots.ts`           |
| `/feed.xml`        | Dynamic   | RSS 2.0 of all posts      |

## Adding content

**A project** — create `content/projects/my-project.mdx`. It will be served at
`/projects/my-project`.

```yaml
---
title: My Project # required
summary: One sentence. # required
date: 2026-04-12 # required
role: Lead engineer
company: Acme
stack: [TypeScript, Postgres]
tags: [Web]
links:
  - { label: Live site, href: https://example.com }
featured: true # surfaces on the home page
order: 1 # manual sort, ascending
draft: false # true hides it from production builds
---
```

**A post** — create `content/blog/my-post.mdx`. Required: `title`, `summary`,
`date`. Optional: `updated`, `tags`, `draft`. Tags automatically produce
`/blog/tags/<slug>` pages and appear in the RSS feed.

**The resume** — edit `content/resume.ts`. It is typed TypeScript rather than
MDX, so the compiler catches mistakes. Drop a PDF in `public/` and set `pdfPath`
to enable the download link.

Frontmatter is validated by zod ([`lib/content/schemas.ts`](lib/content/schemas.ts)).
A missing or malformed field fails the build with the filename and field name
rather than rendering `undefined`.

## Architecture

```
app/                     routes only — no filesystem access
components/mdx.tsx       MDX renderer + component overrides (heading anchors, link rel)
content/                 authored content
lib/content/collection.ts  generic MDX loader: read → parse → validate → cache
lib/content/schemas.ts     frontmatter contracts + resume types
lib/content/{projects,posts,resume}.ts  typed queries
lib/site.ts              name, URL, nav, socials — the one place to edit identity
lib/format.ts            UTC-pinned date formatting
lib/slugify.ts           tag + heading-anchor slugs
```

The content layer is `server-only` and wrapped in React's `cache`, so a page
that asks for the same collection twice hits the filesystem once.

## Before deploying

1. Fill in the `TODO` values in `lib/site.ts` (tagline, description, socials).
2. Replace the placeholders in `content/resume.ts`.
3. Delete the sample files in `content/projects/` and `content/blog/`.
4. Set `NEXT_PUBLIC_SITE_URL` in the hosting environment — canonical URLs, OG
   tags, the sitemap and the feed all depend on it.
