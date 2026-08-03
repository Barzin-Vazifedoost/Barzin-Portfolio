<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Barzin Portfolio

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind 4.

## Commands

```
npm run dev        # dev server, drafts visible
npm run build      # production build; fails on invalid frontmatter
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Layout

- `app/` — routes. Dynamic segments receive `params` as a **Promise**; always `await params`.
- `content/` — authored content. `projects/*.mdx`, `blog/*.mdx`, and `resume.ts`.
- `lib/content/` — the content layer. Reads `content/`, validates frontmatter, exposes typed queries.
- `lib/site.ts` — name, URL, nav, socials. Change site-wide identity here, nowhere else.
- `components/` — shared components.

## Content rules

- Filename is the URL slug: `content/blog/foo.mdx` → `/blog/foo`.
- Frontmatter is validated by zod schemas in `lib/content/schemas.ts`. An invalid
  field fails the build with the file path and the offending key — do not loosen a
  schema to make a build pass.
- `draft: true` hides an entry from production builds while leaving it visible in `next dev`.
- Never read from `content/` inside a route. Go through `lib/content/*`, which is
  `server-only` and wrapped in React `cache`.
- Tag URLs use `slugify()` from `lib/slugify.ts`. Use it on both sides of any tag comparison.

## Conventions

- Dates render through `lib/format.ts`, which pins output to UTC. Do not call
  `toLocaleDateString` directly — it reintroduces server/client drift.
- `NEXT_PUBLIC_SITE_URL` drives canonical URLs, OG tags, the sitemap and the RSS
  feed. Without it everything falls back to `http://localhost:3000`.
