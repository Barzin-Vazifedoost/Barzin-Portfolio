# Front-End Design Audit

**Project:** Barzin Portfolio
**Audited:** 2026-08-10 · commit `711303b`
**Revised:** 2026-08-10 — second pass. New sections: print & alternate rendering (§13), input modality (§14), tooling & quality gates (§15). Corrected the `@theme` finding in §5.1. Extended §2, §4, §5.1, §9, §11, §12, §16 and §18.
**Scope:** Design system, layout, motion, accessibility, performance, SEO/metadata, component architecture.
**Out of scope:** Security, backend, content authoring.

All numbers below are measured, not estimated: contrast ratios computed from the actual token values, bundle sizes from a real `next build`, lint/typecheck from a real run.

The accessibility pass in §9 scores against **WCAG 2.1**. §14 adds the one **WCAG 2.2** criterion that changes the result.

---

## 1. Verdict

This is a **single-concept, high-commitment design**: a dark bioluminescent-green "growth" theme where a generative canvas tree is the primary visual identity and every UI element (nodes, tendrils, spines, drawing underlines) is a variation on that one metaphor. The execution is unusually disciplined for a portfolio — one easing curve, one palette, one motion vocabulary, and a genuinely well-optimised canvas renderer.

The weaknesses are not aesthetic. They are:

1. **Contrast** — the two colors used for *all* small text (`--mid` at 3.73:1, `--text-faint` at 4.03:1) fail WCAG AA at the sizes they are used.
2. **Ship-readiness** — placeholder `TODO` content in the resume and social links, no OG image, default Next.js favicon and unused starter SVGs.
3. **Missing shell states** — no `error.tsx`, no `loading.tsx`, no active-nav indicator.
4. **Token drift** — a Tailwind `@theme` color mapping that is defined and then never used, an exported `QuietLink` component that is never used, and its markup copy-pasted into six files instead.
5. **One input modality** — the design's entire accent vocabulary is gated behind `:hover`. 44 hover utilities, one keyboard equivalent, and no `@media (hover: hover)` guard. Touch and keyboard users get a flatter site than mouse users. (§14)
6. **No print path** — `/resume` is the page most likely to be printed or saved to PDF, and there is not one `@media print` rule in the codebase. With backgrounds dropped, body copy prints at **1.15:1** and role/company names at **1.12:1**. (§13)

Nothing here is architecturally broken. It is a strong design roughly 85% of the way to shippable — with the caveat that "shippable" here has been measured on a desktop mouse, in a screen medium. The second pass found that the two modes nobody tested (print, touch) are where the sharpest failures are.

---

## 2. Stack Inventory

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router, Turbopack | 16.2.12 |
| UI runtime | React | 19.2.4 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) | ^4 |
| Animation | `motion` (Framer Motion successor) | ^12.43.0 |
| Content | `next-mdx-remote/rsc` + `gray-matter` + `zod` | — |
| Fonts | `next/font/google`, self-hosted | Fraunces, JetBrains Mono, Geist |
| Component libs | **none** | — |
| Icon libs | **none** (text arrows `→ ↗ ↓ ←` only) | — |
| CSS-in-JS / variants libs | **none** (no `clsx`, `cva`, `tailwind-merge`) | — |

**Notable:** zero UI dependencies. Every component is hand-written. The only client-side runtime cost is `motion` plus the hand-rolled canvas.

### Build health

| Check | Result |
|---|---|
| `npm run build` | ✅ Compiles in 1.4s, 16 static pages generated |
| `npm run typecheck` | ✅ Clean |
| `npx eslint app components lib` | ✅ Clean, 0 errors 0 warnings |
| `npm run lint` (as configured) | ❌ **13,649 problems** — all 451 errors originate in `.claude/worktrees/`, which the ESLint config does not ignore. Project source is clean; the script is unusable as-is. |
| `npm test` | ❌ **No such script.** No test runner, no CI workflow, no accessibility regression test. See §15. |
| Formatting | ❌ No Prettier, no `format` script, no stylistic lint rules. |

### Client CSS

The original pass measured JS and not CSS. One stylesheet is emitted, shared by every route:

| Artifact | Raw | Gzipped |
|---|---|---|
| `.next/static/chunks/*.css` | **32.6 KB** | **7.1 KB** |

Small, as expected from a design with no component library. But see §5.1 finding 2 — three of those rules exist only because this audit document mentions them.

### Client bundle (gzipped, from `.next/static/chunks`)

| Chunk | Size | Contents |
|---|---|---|
| `25o46h8mdjlrg.js` | 69.4 KB | React + Next runtime |
| `1q-994bdp58y5.js` | **44.9 KB** | **`motion`** |
| `2-5nk792mwq2y.js` | 39.6 KB | framework |
| `0cz1d0mv5g_q7.js` | 38.6 KB | framework |
| others | ~34 KB | app code incl. `growth-tree` |
| **Total client JS** | **~770 KB raw / ~226 KB gz** | |

`motion` is the single largest app-attributable dependency at ~45 KB gz, and it is used on exactly one route (`/`). Inner pages are fully server-rendered with no interactive JS of their own.

---

## 3. Route Inventory

| Route | Render mode | Shell | Notes |
|---|---|---|---|
| `/` | Static | **`HomeScene`** (bespoke) | The only client-heavy route |
| `/projects` | Static | `PageShell` wide | Spine list with stack chips |
| `/projects/[slug]` | SSG (2) | `PageShell` wide | Two-column: prose + facts rail |
| `/blog` | Static | `PageShell` wide | Tag filter row + spine list |
| `/blog/[slug]` | SSG (2) | `PageShell` prose | 68ch reading column |
| `/blog/tags/[tag]` | SSG (2) | `PageShell` wide | Duplicate of `/blog` list markup |
| `/resume` | Static | `PageShell` wide | Experience / Education / Skills |
| `/_not-found` | Static | `PageShell` wide | On-brand 404 |
| `/feed.xml` | **Dynamic (ƒ)** | — | Server-rendered per request |
| `/robots.txt`, `/sitemap.xml` | Static | — | Both correctly wired to `absoluteUrl()` |

**Finding:** `/feed.xml` is the only dynamic route on a site whose content is entirely file-based at build time. It could be static.

**Missing routes:** no `error.tsx`, no `global-error.tsx`, no `loading.tsx`, no `template.tsx`, no tag index page, no `/about`, no contact route.

---

## 4. Component Inventory

Four components total. This is a deliberately small surface.

| File | Lines | Type | Role |
|---|---|---|---|
| `components/growth-tree.tsx` | **1,132** | Client, `ssr:false` | Canvas 2D generative tree — 33% of all front-end code |
| `components/home-scene.tsx` | 424 | Client | Home layout, load sequence, scroll transforms |
| `components/mdx.tsx` | 157 | Server | MDX element overrides (the entire prose system) |
| `components/page-shell.tsx` | 97 | Server | Frame for all 7 non-home pages |

### Internal sub-components (not exported)

- `home-scene.tsx`: `Tendril`, `Eyebrow`, `ItemCard`, `TrailLink`
- `page-shell.tsx`: `PageShell`, **`QuietLink` (exported, never imported anywhere)**
- `projects/[slug]/page.tsx`: `Fact`
- `resume/page.tsx`: `SectionHead`

**Finding — dead + duplicated component:** `QuietLink` (`components/page-shell.tsx:72`) is exported and used zero times. Its exact markup — an `.eyebrow` link with an `absolute -bottom-1 … scale-x-0 … group-hover/link:scale-x-100` underline — is instead hand-copied into **six** places:

- `app/blog/[slug]/page.tsx:91`
- `app/blog/tags/[tag]/page.tsx:76`
- `app/projects/[slug]/page.tsx:67` and `:100`
- `app/resume/page.tsx:48`, `:58`, `:73`
- `components/home-scene.tsx:225` (`TrailLink`, a near-identical reimplementation)

Any change to the link treatment currently requires editing seven files.

**Finding — `QuietLink` would be wrong if it were used.** It renders a bare `<a href>` (`page-shell.tsx:84`) with no branch for internal routes. Five of the seven call sites it is meant to replace are `next/link` navigations (`/blog`, `/projects`). Adopting `QuietLink` as written would convert them into full document loads, dropping client-side routing and the prefetch. The component needs the same internal/external split `mdx.tsx:129` already implements before it can absorb its copies.

**Finding — duplicated list markup:** `app/blog/page.tsx:44-74` and `app/blog/tags/[tag]/page.tsx:43-73` are the same 30-line post-card list, character for character apart from the wrapper. `app/projects/page.tsx` and `app/not-found.tsx` use a third and fourth variant of the same spine-list pattern. There is no `<PostList>` / `<SpineItem>` abstraction.

---

## 5. Design System

Defined entirely in `app/globals.css` (100 lines). There is no `tailwind.config.js` — Tailwind v4 CSS-first configuration.

### 5.1 Color tokens

| Token | Value | Semantic role | Where used |
|---|---|---|---|
| `--bg` | `#050805` | Page ground (near-black green) | `html`, `body`, canvas clear |
| `--bg-raised` | `#08110a` | Raised surface | **1 use only** — skip-link background |
| `--deep` | `#0a3d1a` | Emerald / hairline borders / roots | 29 uses |
| `--mid` | `#1a7a3a` | Mid canopy / **all quiet-link & eyebrow text** | 30 uses |
| `--neon` | `#39ff14` | Accent, focus ring, hover, glow | 38 uses |
| `--core` | `#c8ffdb` | Mint highlight, tips, hover titles | 13 uses |
| `--text` | `#dcf5e4` | Body copy | 3 uses |
| `--text-dim` | `#8fae99` | Summaries, MDX paragraphs | 21 uses |
| `--text-faint` | `#5d7566` | `.meta` — dates, counts | 14 uses |

**Structure:** a 5-stop green luminance ramp (`bg → deep → mid → neon → core`) plus a 3-stop text ramp. One hue family. No secondary or semantic colors — no red/amber/blue for error, warning, or info states anywhere in the system.

**Findings:**

1. **The Tailwind `@theme inline` block is *mostly* dead — but not entirely.** `globals.css:32-44` maps every token to a Tailwind theme key. A grep across `app/` and `components/` finds zero uses of the generated color utilities; every color reference uses the arbitrary-value form `text-[var(--neon)]` instead.

   The **font** mappings are a different story, and the original pass got this wrong. Checking the emitted stylesheet rather than the source:

   | Mapping | Emitted in built CSS? | Verdict |
   |---|---|---|
   | `--font-mono` | ✅ `.font-mono{font-family:var(--font-jetbrains-mono)}` | **Live** — used at `mdx.tsx:92` and `mdx.tsx:101` |
   | `--font-sans` | ❌ not emitted | Dead — `body` sets `font-family` directly in CSS |
   | `--font-display` | ❌ not emitted | Dead — `.display` sets `font-family` directly |
   | all 8 `--color-*` | partially — see below | Dead in source |

   So **deleting the block is not safe**: inline code and code blocks would silently fall back to the default `ui-monospace` stack. Either keep `--font-mono` and drop the rest, or convert `mdx.tsx`'s two `font-mono` classes to `font-[var(--font-jetbrains-mono)]` first.

2. **Three color utilities ship in production, and this document is the reason.** Tailwind v4 has no `content` array — it auto-detects source files by walking the project and skipping what `.gitignore` excludes. `.gitignore` does not exclude `.md`, and it does not exclude `.claude/`. So the scanner reads `FRONTEND-AUDIT.md`. Section 5.1 of the original pass names `text-neon`, `bg-mid`, and `border-deep` as examples of utilities nobody uses — and the production stylesheet now contains exactly:

   ```css
   .text-neon{color:var(--neon)}
   .bg-mid{background-color:var(--mid)}
   .border-deep{border-color:var(--deep)}
   ```

   Those three and no others from the color mapping. **The audit generated the dead CSS it was reporting.** The bytes are trivial; the mechanism is not. Two consequences:

   **Verified during this revision.** Writing §13 added the string `print:hidden` to this file. Rebuilding produced a stylesheet **435 bytes larger** (32,629 → 33,064) now containing `.print\:hidden{display:none}` — a utility no source file uses, generated by a recommendation *to* use it. The mechanism reproduces on demand. Two consequences:

   - Any class-like string in any tracked `.md` file becomes real CSS.
   - `.claude/worktrees/` is scanned too. A worktree holding a variant of the site leaks its class names into the main stylesheet — the same root cause as **PERF-6**, which diagnosed it as an ESLint problem. The fix belongs in `.gitignore` (`.claude/`), where it resolves both tools at once, not in `eslint.config.mjs` alone.

3. **The palette is defined twice.** `globals.css:7-13` declares the five structural greens, and `components/growth-tree.tsx:31-37` re-declares the identical five hex values in `GROWTH_TREE_PALETTE`. The CSS comment claims to be "Ground truth for the whole site," but the canvas cannot read CSS variables from JS without a `getComputedStyle` call, so it hardcodes a copy. Changing a green requires two edits.
4. **One untokenized hex:** `components/mdx.tsx:101` uses `bg-[#040604]` for code-block backgrounds — a sixth background shade with no token.
5. **`--bg-raised` is effectively dead** at one usage. There is no card/panel/elevation system that would justify it.
6. **No `::selection` style.** Selecting text anywhere on the site paints the UA default — a blue-on-white highlight, dropped into a green-on-near-black palette. It is the one piece of UI the design does not control, and it appears every time a visitor copies an email address or a code snippet. Three lines in `globals.css`.
7. **No `forced-colors` or `prefers-contrast` handling.** Windows High Contrast Mode substitutes the entire palette: the canvas becomes a flat block, every `shadow-[0_0_12px_var(--neon)]` glow disappears, and the `--deep` hairline spines — the site's primary structural device — resolve to system border colors at unpredictable weights. Nothing is authored for that mode. `prefers-contrast: more` is likewise unhandled, which is a missed opportunity given §5.2 already documents two tokens below AA: that media query is exactly where the accessible variants belong.
8. **No `text-wrap: balance` or `pretty`.** The hero runs at `clamp(3rem, 9vw, 7.5rem)` and is split per-word for the load animation (`home-scene.tsx:306-320`), so its line breaks are entirely viewport-driven — a single-word orphan on the last line is likely at some widths. Card titles, the `PageShell` `<h1>`, and MDX `h2`/`h3` have the same exposure. `balance` on headings and `pretty` on prose are two declarations and are supported across current Chrome, Safari and Firefox.

### 5.2 Contrast audit (WCAG 2.1, against `--bg #050805`)

| Token | Ratio | Verdict | Actual usage |
|---|---|---|---|
| `--core` `#c8ffdb` | **18.00:1** | AAA | Tagline, hover states, MDX links |
| `--text` `#dcf5e4` | **17.47:1** | AAA | Body copy |
| `--neon` `#39ff14` | **14.84:1** | AAA | Focus ring, accent, glow |
| `--text-dim` `#8fae99` | **8.32:1** | AAA | Summaries, MDX `<p>` |
| `--text-faint` `#5d7566` | **4.03:1** | ⚠️ **Fails AA** | `.meta` — dates, reading time, counts, at **11.5px** |
| `--mid` `#1a7a3a` | **3.73:1** | ❌ **Fails AA** | `.eyebrow` — **nav links, section labels, every quiet link**, at **11.2px** |
| `--deep` `#0a3d1a` | 1.62:1 | n/a (non-text) | Hairline borders — acceptable for decorative rules |

**This is the most significant finding in the audit.** AA requires 4.5:1 for text below 18.66px (or below 14px bold). Both failing tokens are used exclusively at ~11–11.5px, well under that threshold, so the "large text" 3:1 allowance does not apply.

The blast radius is wide because `--mid` is the color of the `.eyebrow` class, and `.eyebrow` is used for:

- Every header nav link (`app/layout.tsx:78, 87`)
- Every footer link, including Email / GitHub / LinkedIn / RSS (`app/layout.tsx:110, 121, 130`)
- The skip link
- Every "← All posts" / "All projects →" / project-link back-navigation
- The resume's email and social links
- Every section label

So the site's **primary navigation is the least legible text on the page**, at 11.2px with 0.22em letter-spacing.

The good news: the fix is contained. Both `.eyebrow` and `.meta` are single CSS classes in `globals.css:61-75`. Lifting `--mid`'s text usage to roughly `#2fa855` reaches ≈4.5:1 without disturbing the canvas (which uses `--mid` for *strokes*, not text, and has its own copy of the value anyway). Note the color is also doing double duty as a border color at `hover:border-[var(--mid)]`, where 3:1 is the relevant bar and it passes.

### 5.3 Typography

Three families, all self-hosted via `next/font/google` (no external network requests, no FOIT).

| Family | Variable | Voice | Rendered as |
|---|---|---|---|
| **Fraunces** (variable serif, optical sizing) | `--font-fraunces` | "Display" | `.display` — hero, all titles, h2/h3 |
| **JetBrains Mono** | `--font-jetbrains-mono` | "Engineer" | `.eyebrow`, `.meta`, code |
| **Geist** | `--font-geist-sans` | "Body" | `body` default, all prose |

**Type scale** — fully fluid, `clamp()`-based (`globals.css:20-26`):

| Token | Value | Range |
|---|---|---|
| `--step-hero` | `clamp(3rem, 9vw, 7.5rem)` | 48 → 120px |
| `--step-tagline` | `clamp(1.25rem, 2.2vw, 1.9rem)` | 20 → 30.4px |
| `--step-title` | `clamp(1.15rem, 1.5vw, 1.5rem)` | 18.4 → 24px |
| `--step-body` | `clamp(0.95rem, 1vw, 1.05rem)` | 15.2 → 16.8px |
| `--step-eyebrow` | `0.7rem` (**fixed, 11.2px**) | — |
| `--step-meta` | `0.72rem` (**fixed, 11.5px**) | — |

**Findings:**

1. **Body text tops out at 16.8px and starts at 15.2px.** Below the 16px browser default on small screens. Combined with `line-height: 1.7` it reads fine, but it is on the small side for long-form.
2. **The two smallest steps are the two that don't scale.** Eyebrow and meta are fixed at 11.2/11.5px on every viewport — these are precisely the sizes where the contrast failures live. A `clamp()` floor of ~12px would help both problems at once.
3. **No `weight` is specified on any font.** All three load as full variable fonts. Fraunces in particular carries `wght`, `SOFT`, `WONK`, and optical-size axes; only `wght` and optical sizing are used. `axes` narrowing on the `Fraunces()` call would trim real bytes.
4. **Three families is a lot** for a site with this little text. Geist and Fraunces are doing distinct jobs; the case for all three is defensible, but it is three font payloads on first paint.
5. `display: "swap"` on all three → FOUT rather than FOIT. Correct choice for this design.
6. `.display` sets `line-height: 0.92` globally, then `PageShell` overrides to `leading-[0.95]` and `ItemCard` inherits the tight 0.92 at 18–24px title size — tight but intentional.

### 5.4 Motion tokens

| Token | Value | Discipline |
|---|---|---|
| `--ease-flow` | `cubic-bezier(0.16, 1, 0.3, 1)` | **39/39 CSS transitions use it.** No exceptions. |
| `EASE` (JS) | `[0.16, 1, 0.3, 1]` | Same curve, mirrored in `home-scene.tsx:29` |

**Durations** are less disciplined but still tight: `duration-500` ×36, `duration-300` ×7, `duration-700` ×1. There is no duration *token* — the values are Tailwind literals. Three values across 44 transitions is acceptable consistency; the outlier `duration-700` (`home-scene.tsx:213`, the title underline) is a one-off.

**Timing constants** for the home load sequence are properly extracted and documented (`home-scene.tsx:32-54`): `heroDelay 0.15s`, `heroStagger 0.09s`, `blockStagger 0.14s`, `reveal 0.9s`.

### 5.5 Spacing

**There is no spacing scale.** Values are raw Tailwind utilities chosen per-site. Observed vertical rhythm:

- `PageShell`: `pt-16 pb-24`, header `mb-16 pb-10`
- Home sections: `py-20`, hero `py-16`, cards `py-7`
- Index list items: `py-8`
- Footer: `mt-24 pb-10`

Inner pages and the home page therefore use different section rhythms (`py-16/24` vs `py-20`). Not visibly wrong — the pages are never seen side by side — but it is unsystematised, and there is no token to change if the rhythm needs tuning.

### 5.6 Shape & elevation

- **Radius:** almost entirely square. `rounded-full` for the 1.5px dots and pill chips, `rounded-sm` for code blocks / images / the skills grid, `rounded` for inline code. No radius token.
- **Elevation:** no shadows used for depth. `shadow-[0_0_12px_var(--neon)]` and `[0_0_14px_var(--neon)]` are used exclusively as **glow**, on the accent dots. This is consistent with the bioluminescence concept.
- **Borders:** one weight (`1px`), one color family (`--deep`, usually at `/60` opacity). The left-border "spine" (`border-l border-[var(--deep)]/60`) is the site's primary structural device and appears on 5 of 8 pages.

---

## 6. Motion System

### 6.1 Home page (`components/home-scene.tsx`)

Three independent motion layers:

**A. Load sequence** — a staggered cascade on mount. Eyebrow → each hero word individually → tagline → description → scroll cue, each with its own computed delay derived from `TIMING`. Hero words are split on whitespace and animated per-word (`:306-320`).

**B. Scroll-linked transforms** — each `ItemCard` runs its **own** `useScroll` with `offset: ["start end", "center center"]`, driving four simultaneous transforms (`:171-174`):

| Transform | Range |
|---|---|
| `y` | 72px → 0 (rise) |
| `x` | ±26px → 0 (alternating drift by index parity) |
| `rotate` | ±2.6° → 0 (alternating) |
| `opacity` | 0 → 1 over the first 55% |

Plus a global `useScroll` driving the fixed left "spine" fill (`:249-251`).

**C. Hover/focus interaction** — hovering or focusing a card sets local `active` state, which (i) brightens and completes the SVG `Tendril` path, (ii) lights the node dot, (iii) draws the title underline, and (iv) **dispatches a `growth-tree:surge` window event** that injects 5 extra data pulses into the canvas. This is the one place the DOM and the canvas talk to each other, and it is done via a decoupled event channel in `lib/tree-events.ts` specifically so `home-scene` never statically imports the canvas module and undo the `ssr:false` split. Genuinely good architecture.

**Performance handling:** `willChange: "transform, opacity"` is set explicitly on animated cards (`:190`) with a comment explaining why — without compositor promotion, continuously-changing opacity + rotate forces text re-rasterisation every frame. Correct and non-obvious.

### 6.2 Reduced motion

Handled at **four** independent layers, which is unusually thorough:

1. **CSS** — `globals.css:91-100` nukes all animation/transition durations to 0.001ms under `prefers-reduced-motion: reduce`.
2. **MotionConfig** — `reducedMotion="user"` at the root of `HomeScene` (`:256`).
3. **Per-component** — `useReducedMotion()` guards, e.g. `ItemCard` passes `style={undefined}` entirely rather than animating to a static value (`:190`).
4. **Canvas** — `growth-tree.tsx:335` reads `matchMedia`, and under reduced motion **fast-forwards the entire growth simulation** to a settled tree (`settle()`, `:924-930`), renders one static frame, and never starts a rAF loop at all. It also subscribes to `change` on the media query to react live.

### 6.3 No-JS fallback

`home-scene.tsx:262-264` injects a `<noscript>` style block that forces `[data-reveal]{opacity:1;transform:none}`. Without it, every entrance-animated element would prerender at `opacity: 0` and stay invisible for non-JS clients. The `data-reveal` attribute is applied to all 8 entrance-animated elements. This is a detail most portfolios miss entirely.

---

## 7. The GrowthTree Canvas

`components/growth-tree.tsx` — 1,132 lines, a third of the front-end codebase, and the site's entire visual identity. It deserves its own section.

### What it is

A hybrid organic-tree / data-graph rendered in Canvas 2D. Branches are edges drawn as quadratic curves; junctions and tips are nodes; "data pulses" travel up the branches. The whole structure unfurls from a seed below the fold over ~5.5s.

**Zero dependencies.** Hand-rolled rAF loop, hand-rolled mulberry32 PRNG (`:243-251`) so a given seed is reproducible.

### Architecture

- **Structure:** branches store an angle **relative to their parent**, which is what lets wind sway accumulate naturally down the hierarchy rather than being faked per-branch. Parents always precede children in the array, so `solve()` (`:528-551`) resolves world angles and endpoints for the entire tree in a **single forward pass**.
- **Botanical realism:** per-level length/width falloff (0.79 / 0.74), fork-spread decay with depth, gravitropism (a restoring pull toward vertical applied in *world* space), and a hard angular cone (`coneLeft 0.95` / `coneRight 1.3`) to stop a chain that keeps taking the same fork from spiralling. The asymmetric cone is a **design** decision: the canopy opens rightward, away from the text column.
- **Composition-aware:** `rootXRatio: 0.44` puts the trunk left of centre on desktop so the text column sits to its left, and centres it (`0.5`) on mobile.

### Render pipeline

1. Baked backdrop blit (ground glow, from a cached half-res canvas)
2. Scene drawn once into an offscreen buffer with `globalCompositeOperation = "lighter"`
3. Composited straight, then **again** blurred + additive at 0.3× scale for **bloom**
4. Drifting mist "veil" — 7 scaled blits of one cached 256px blob
5. Baked vignette blit

**Scroll integration:** the whole scene has a camera drift (300px), deeper branch layers get extra parallax (190px), and as you scroll the tree **fades out** (`veilTreeFade: 0.78`) behind rising mist while the ambient spores **brighten and swell** to carry the composition. The background narrative is: you climb, the canopy closes, the tree dissolves into spore-light.

### Performance engineering (measured decisions, all commented)

| Technique | Value |
|---|---|
| Frame cap | **30fps** normally, **18fps while scrolling** (main thread reserved for the DOM) |
| DPR cap | **1.25** desktop / **1.0** mobile — deliberately sub-retina; it's a soft bloomed glow, extra pixels buy nothing |
| Mobile budget | depth −2, nodes ×0.45, spores ×0.4 |
| Batching | Edges and nodes batched into **one path per depth level** (shared width/alpha/parallax) |
| Particle batching | Spores and sparks bucketed into 3 alpha tiers → 3 fills instead of N |
| Backdrop baking | Ground glow + vignette + mist blob baked **once per resize**, then blitted |
| Adaptive degradation | 40 consecutive frames over 22ms → **bloom disabled permanently**, one-way |
| Scroll range caching | `scrollHeight` read from a `ResizeObserver`, never in the scroll handler (avoids forced sync reflow) |
| Visibility | `IntersectionObserver` + `visibilitychange` + a **geometric fallback** because a fixed full-viewport layer can report not-intersecting on first callback and never fire again |
| Delta clamping | `Math.min(0.05, dt)` so a backgrounded tab doesn't resume with one enormous step |
| Bundle | `dynamic(… { ssr: false })` from inside the client boundary, keeping it out of the initial payload |

The cleanup function (`:1109-1119`) disconnects all three observers and removes all five listeners. No leaks.

### Interaction

- **Hover a content card** → `surge()` injects 5 bright pulses at the trunk.
- **Click anywhere on the background** → `replant()` re-seeds and regrows the entire tree. The pointer handler (`:1038-1051`) listens on `window` (the layer is `pointer-events: none`) and bails out on `a, button, input, textarea, select, summary, [role='button'], [tabindex], [data-tree-ignore]` — and the whole content column carries `data-tree-ignore`.

**Finding:** the replant-on-click is completely undiscoverable. There is no affordance, no cursor change, no hint. It's a nice easter egg, but a user who clicks empty space to dismiss something will instead watch the entire background restart a 5.5s animation with no way to undo it.

**Finding:** the canvas is `aria-hidden="true"` and `pointer-events: none` — correct. But it is *only* mounted on `/`. The other seven pages get a static CSS `radial-gradient` stand-in (`page-shell.tsx:36-41`) instead. This is the right performance call, but it means the site's defining visual is absent from 7 of 8 pages, and the home page is a distinctly different experience from the rest of the site.

---

## 8. Layout & Responsive

### Breakpoints in use

**Only two:** `lg:` (×11) and `sm:` (×6). No `md:`, `xl:`, or `2xl:` anywhere.

| Range | Behaviour |
|---|---|
| < 640px | Single column, `px-6`. Canvas trunk centres, depth −2, particles ×0.4. Tendrils hidden. |
| 640–1024px | `px-10`. Still single column. **The widest gap in the design** — a tablet gets desktop padding with mobile layout. |
| ≥ 1024px | Home splits to `grid-cols-[minmax(0,46%)_1fr]`; project pages split to `[1fr_minmax(0,15rem)]`; tendrils appear; scroll spine appears. |

### Measures

| Context | Width |
|---|---|
| `PageShell` wide | `max-w-5xl` (64rem) |
| `PageShell` prose | `max-w-[68ch]` |
| Card summaries | `max-w-[60ch]` |
| Resume body | `max-w-[62ch]` |
| Page lead | `max-w-[52ch]` |
| Home description | `max-w-md` |

Six different measures. Sensible values individually, no token governing them.

### Findings

1. **`min-h-[82vh]` on the hero** (`home-scene.tsx:293`) — the only viewport-unit height in the codebase, and it uses `vh` rather than `dvh`. On mobile Safari/Chrome this measures against the *largest* viewport (chrome retracted), so at rest with the address bar visible the hero overflows and the "Scroll to climb" cue can sit below the fold. `min-h-[82dvh]` is a one-character-class fix.
2. **The home grid's second column is empty.** `grid-cols-[minmax(0,46%)_1fr]` at `:290` wraps a single child. The right 54% exists purely to reserve canopy space. It works, but a `max-w` on the content column would express the same intent without a grid.
3. **The legibility scrim** (`:269-276`) is a fixed full-viewport gradient at `w-full` below `lg` and `lg:w-[62%]` above. Below `lg` it covers the entire screen at 0.94→0 opacity, meaning on mobile the tree is heavily veiled across the whole viewport — the canvas is running at full cost while being mostly hidden.
4. **The project facts rail** uses `lg:order-1` / `lg:order-2` to put facts *above* the body on mobile and *beside* it on desktop. Correct instinct, though it means mobile readers hit a metadata table before the article.
5. **Navigation has no mobile treatment** — `flex flex-wrap` with 4 items. At 11.2px this fits on any phone, so no hamburger is needed. Fine as-is, but it will not survive a 5th or 6th nav item.

---

## 9. Accessibility Audit

### What's done right

| Practice | Location |
|---|---|
| Skip link, `sr-only` → `focus:not-sr-only` | `layout.tsx:67-72` |
| Visible focus ring, 2px `--neon`, 3px offset, **at 14.84:1** | `globals.css:85-89` |
| `prefers-reduced-motion` at 4 layers | see §6.2 |
| No-JS content fallback | `home-scene.tsx:262-264` |
| `aria-hidden` on every decorative element | 20+ instances, consistently applied |
| `aria-label` on nav and every unlabelled list | `Main`, `Tags`, `Stack`, `Project links` |
| `aria-labelledby` on every `<section>` | home ×2, resume ×3 |
| Semantic `<time datetime>` with ISO values | every date on the site |
| `target="_blank"` always paired with `rel="noopener noreferrer"` | 8/8 instances |
| MDX headings get stable `id`s + anchor links | `mdx.tsx:30-49` |
| `scroll-mt-24` on MDX headings so anchors don't land under the header | `mdx.tsx:21-23` |
| Canvas is `aria-hidden` + `pointer-events:none` | `growth-tree.tsx:1125-1126` |
| `<pre>` owns an `overflow-x-auto` scroll container | `mdx.tsx:99-104` |
| Tables wrapped in `overflow-x-auto` | `mdx.tsx:106-110` |

### Findings

**A11Y-1 · Contrast failures on all small text — HIGH.** See §5.2. `--mid` (3.73:1) and `--text-faint` (4.03:1) both fail AA at the 11.2/11.5px sizes they are used at. Affects all navigation, all footer links, all section labels, all dates and counts.

**A11Y-2 · Duplicate headings in the accessibility tree — MEDIUM.** Both the home page and the resume page render a visually-hidden `<h2>` *and* a visible label with identical text:

- `home-scene.tsx:378-381` — `<h2 class="sr-only">Selected work</h2>` immediately followed by `<Eyebrow>Selected work</Eyebrow>`. Same at `:400-403` for "Recent writing".
- `resume/page.tsx:89-92` — `<h2 class="sr-only">Experience</h2>` followed by `<SectionHead>Experience</SectionHead>`, which itself renders **another `<h2>`** with the same string. Two sibling `h2` elements reading "Experience". Same for Education (`:149-152`) and Skills (`:187-190`).

A screen reader announces each section heading twice. On the resume it's two real headings, so the heading outline lists every section twice.

**A11Y-3 · No active-page indicator — MEDIUM.** `grep aria-current` returns nothing. The nav (`layout.tsx:82-93`) gives no visual or programmatic signal of which page you're on. On a 4-page site this is the single most-missed navigational affordance.

**A11Y-4 · Whole-card links produce verbose announcements — LOW.** On `/blog`, `/projects`, `/blog/tags/[tag]` and the 404, the `<Link>` wraps the title, date, reading time, summary, and stack chips. The accessible name of each link is the concatenation of all of it. The tab order is fine (one stop per card, which is good), but the announcement is long.

**A11Y-5 · Nested interactive elements in project cards — LOW.** `projects/page.tsx:56-67` renders a `<ul aria-label="Stack">` of chips *inside* the card's `<Link>`. Non-interactive list items inside an anchor is valid HTML but produces awkward list-inside-link semantics.

**A11Y-6 · MDX images have no dimensions — LOW.** `mdx.tsx:121-124` renders a raw `<img>` (with an eslint-disable for `no-img-element`) with no `width`/`height`. Any image in a post will cause layout shift. `alt=""` is correctly placed *before* the spread so an authored `alt` overrides it — that part is right.

**A11Y-7 · Fixed-size text at the smallest steps — LOW.** `--step-eyebrow` and `--step-meta` are fixed rem values that don't scale with viewport. They do respond to user font-size settings (rem-based), so this is a preference issue rather than a violation.

**A11Y-8 · Scrolling regions are not keyboard reachable — MEDIUM.** *(WCAG 2.1.1 Keyboard)* The table above credits `<pre>` and `<table>` for owning their own `overflow-x-auto` containers. The container is right; the focusability is missing. Neither `mdx.tsx:99-104` (`<pre>`) nor `mdx.tsx:106-110` (the table wrapper `<div>`) carries `tabIndex={0}`, and neither has an accessible name or `role="region"`. A scrollable element that receives no keyboard focus cannot be scrolled without a pointer, so a wide code block or table is partly unreadable to a keyboard-only user. Chrome and Firefox now auto-focus overflow containers that hold no focusable children, but Safari does not, and the criterion is not satisfied by a browser heuristic. Adding `tabIndex={0}` + `role="region"` + `aria-label` to both is the complete fix.

**A11Y-9 · Hover-gated affordances have no focus equivalent — MEDIUM.** Exactly one of the site's 44 hover treatments wires a keyboard counterpart: `ItemCard` (`home-scene.tsx:194-195`) pairs `onFocus`/`onBlur` with its hover state. Nothing else does — not the nav, the footer, the tag chips, the list-item node dots (`group-hover:` with no `group-focus-within:`), or any of the seven copies of the drawing underline.

The sharpest case is the MDX heading anchor. `mdx.tsx:37-41` renders the `#` at `opacity-0` and reveals it only on `group-hover`. It is a real, focusable link in the tab order of every article, and on keyboard focus it stays fully transparent — the user lands on an invisible control whose only indication is the global outline drawn around empty space. Adding `group-focus-within:opacity-100` fixes that one; the general pattern is to pair every `hover:` with `focus-visible:` and every `group-hover:` with `group-focus-within:`.

**A11Y-10 · Target sizes below the WCAG 2.2 minimum — MEDIUM.** See §14.3. Nav and footer links are bare `.eyebrow` text with no padding, measuring roughly 19px tall against a 24×24 CSS px floor.

**A11Y-11 · `<article>` and the facts rail have no accessible name — LOW.** On both detail routes the `<h1>` is rendered by `PageShell`'s `<header>`, *outside* the `<article>` element (`blog/[slug]/page.tsx:57`, `projects/[slug]/page.tsx:62`). The article landmark therefore has no name for a screen reader's landmark list. The project facts `<aside>` (`projects/[slug]/page.tsx:81`) is a complementary landmark with no `aria-label` at all. Both take one attribute.

---

## 10. Performance Audit

### Strengths

- **7 of 8 routes ship no interactive JS of their own.** `PageShell`, `Mdx`, and every inner page are server components with zero hydration.
- **The canvas is code-split** behind `dynamic(… ssr:false)` and is only requested on `/`.
- **Fonts are self-hosted** by `next/font` — no `fonts.googleapis.com` round-trip, no render-blocking external CSS.
- **Everything is prerendered.** 16 static pages, `generateStaticParams` on all three dynamic segments.
- **Content layer is `server-only` and React-`cache`d**, so the four parallel `Promise.all` reads on the home page deduplicate.
- **The canvas optimisation work is genuinely thorough** — see §7. Frame capping, scroll back-off, batched paths, baked backdrops, adaptive bloom degradation, no layout thrashing in the scroll handler.
- **`willChange` applied deliberately**, with the reasoning documented.

### Findings

**PERF-1 · `motion` costs ~45 KB gz for one route.** It powers the home page's load cascade, six per-item `useScroll` instances, and the spine fill. Most of what it does here — staggered entrances, scroll-linked opacity/transform — is expressible with CSS `@keyframes` + `animation-timeline: view()`, now baseline in Chrome/Edge/Safari 26. That would be a real reduction on the site's most important route. Whether it's worth the rewrite depends on how much you value the Firefox fallback.

**PERF-2 · Three variable font families load on first paint.** No `axes` narrowing on Fraunces, no `weight` restriction on any of the three. Fraunces ships `wght`, `SOFT`, `WONK`, and optical sizing; only two axes are used.

**PERF-3 · The canvas runs at full cost on mobile while being ~94% obscured.** The scrim is `w-full` below `lg` (`home-scene.tsx:271`), so the entire tree is behind a 0.94→0 opacity gradient. Mobile budgets already cut depth and particles, but the render loop, bloom composite, veil blits, and vignette all still run. Skipping bloom outright below `mobileBreakpoint` would be nearly invisible and meaningfully cheaper.

**PERF-4 · `/feed.xml` is server-rendered on demand** despite being derived entirely from build-time content.

**PERF-5 · No image pipeline at all.** Zero uses of `next/image`. The only `<img>` path is the raw MDX override. The moment a project case study includes a screenshot, it ships unoptimised, unsized, and un-lazy-loaded. This is the largest latent performance risk in the codebase.

**PERF-6 · `npm run lint` walks `.claude/worktrees/`**, producing 13,649 findings and taking far longer than it should. Adding `.claude/**` to the `globalIgnores` array in `eslint.config.mjs:9-15` fixes it.

---

## 11. SEO, Metadata & Social

### What's wired correctly

| Feature | Status |
|---|---|
| `metadataBase` from `NEXT_PUBLIC_SITE_URL` | ✅ `layout.tsx:29` |
| Title template `%s — Barzin Vazifedoost` | ✅ |
| Per-route `description` + `alternates.canonical` | ✅ all 7 routes |
| OpenGraph `type: article` with `publishedTime` / `modifiedTime` | ✅ posts and projects |
| `keywords` from post tags | ✅ |
| `sitemap.xml` with per-entry `lastModified` and priorities | ✅ includes tag pages |
| `robots.txt` pointing at the sitemap | ✅ |
| RSS feed, discoverable via `alternates.types` | ✅ |
| Dates pinned to UTC via `lib/format.ts` | ✅ no server/client drift |
| Trailing-slash normalisation on the site URL | ✅ `site.ts:6-8` |

### Findings

**SEO-1 · No OG image exists — HIGH.** `layout.tsx:45-49` declares `twitter: { card: "summary_large_image" }`, and no `images` field is set anywhere, no `app/opengraph-image.tsx` exists, and `public/` contains no image asset. Every link shared to Twitter/X, LinkedIn, Slack, iMessage, or Discord renders as a bare text card — and `summary_large_image` specifically requests the *large* format, so the failure is more conspicuous than the default. For a portfolio, where sharing the link *is* the distribution channel, this is the highest-leverage single fix in this document. Next 16 supports a generated `opengraph-image.tsx` that could render the title over the site's own palette.

**SEO-2 · Placeholder identity is live — HIGH.**

- `lib/site.ts:33-34` — social links point at `https://github.com/TODO` and `https://www.linkedin.com/in/TODO`. These render in the **footer of every page** and on the resume, and they 404.
- `lib/site.ts:25` — tagline is `"Software engineer."`, marked `TODO: one line on what you do`. It renders as the hero's largest secondary line and as part of the default `<title>`.
- `content/resume.ts` — **the entire resume is placeholder**: "TODO Company", "TODO Role", "TODO University", "TODO: City, Country", and a summary that literally reads `"TODO: two or three sentences covering..."`. The `/resume` route is fully built, styled, and in the sitemap, serving this.

**SEO-3 · Default favicon — MEDIUM.** `app/favicon.ico` is 25,931 bytes, the size of the stock `create-next-app` icon. No `icon.tsx`, `apple-icon`, or `manifest.json`. The site has an extremely distinctive visual (a neon-green node on near-black) that would make an excellent favicon.

**SEO-4 · Unused starter assets — LOW.** `public/` contains `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`. A grep across `app/`, `components/`, `lib/`, and `content/` finds zero references to any of them. They ship to the deploy.

**SEO-5 · No structured data — LOW.** No JSON-LD `Person`, `BlogPosting`, or `BreadcrumbList`. For a personal portfolio, a `Person` schema on the home page and `BlogPosting` on posts is a cheap and material addition.

**SEO-6 · Footer copyright year freezes at build time — LOW.** `layout.tsx:104` calls `new Date().getFullYear()` in a server component on a statically prerendered page. It bakes in the build year and will show a stale year until the next deploy.

**SEO-7 · No `viewport` export, so no `theme-color` — MEDIUM.** `app/layout.tsx` exports `metadata` but never exports `viewport`. Next 16 splits these deliberately: `theme-color`, `colorScheme`, and viewport settings live on the `Viewport` object, and there isn't one. Consequences:

- **No `<meta name="theme-color">`.** On Android Chrome the toolbar and on iOS Safari the surrounding chrome render in their default light treatment, framing a `#050805` page in near-white. For a site this committed to one ground color, that seam is visible on every mobile visit.
- **`color-scheme` is CSS-only.** `globals.css:48` sets `color-scheme: dark` on `html`, which is correct but only takes effect once the stylesheet parses. Declaring `colorScheme: "dark"` in the `viewport` export emits the meta tag into the document head, so form controls, scrollbars, and the pre-paint background resolve dark immediately. This is also the cheapest available fix for the white flash on first paint.

**SEO-8 · `og:locale` is malformed — LOW.** `site.locale` is `"en"` (`lib/site.ts:29`) and is spent on three consumers with two incompatible formats. It is correct as `<html lang>` (BCP 47) and correct for `Intl.DateTimeFormat` in `lib/format.ts:11`. It is **wrong** for `openGraph.locale` (`layout.tsx:39`), which the Open Graph protocol specifies as `language_TERRITORY` — `en_US`, not `en`. It is also emitted as RSS `<language>` (`feed.xml/route.ts:40`), where `en` is valid. One field, three contracts, one of them violated. Split it into `locale` and `ogLocale`.

**SEO-9 · The 404 is indexable and untitled — LOW.** `app/not-found.tsx` exports no `metadata`, so it inherits the root default title (`Barzin Vazifedoost — Software engineer.`) and carries no `robots: { index: false }`. No route in the codebase sets `robots` metadata at all. A crawler that reaches a stale inbound link gets a 200-looking, fully-titled page in the index. It also hardcodes its own four-item link list (`not-found.tsx:5-10`) instead of deriving from `site.nav`, so it will drift the first time navigation changes.

**SEO-10 · The schemas have no image field — MEDIUM.** Neither `projectFrontmatterSchema` nor `postFrontmatterSchema` (`lib/content/schemas.ts:32-58`) accepts a `cover` or `image` key. This is upstream of **SEO-1**: even after adding a site-wide `opengraph-image.tsx`, there is no authoring path to a per-post or per-project card, and no hero image on a case study. For a portfolio whose unit of work is the visual case study, that is the field most likely to be wanted next. Add it to the schema before writing real content, so it doesn't require a migration.

**SEO-11 · Sitemap static routes carry no `lastModified` — LOW.** `app/sitemap.ts:13-18` gives the four static routes `changeFrequency` and `priority` but no `lastModified`, and the tag routes (`:34-38`) omit it as well, though both are derivable — `/blog` from the newest post, a tag page from the newest post carrying it. `changeFrequency` and `priority` are hints Google has said publicly it ignores; `lastModified` is the one it reads.

---

## 12. Content Layer (front-end surface)

Not front-end proper, but it defines what the UI can render.

- **`lib/content/`** is `server-only` and wrapped in React `cache`. Routes never touch `content/` directly.
- **Zod schemas** (`lib/content/schemas.ts`) validate every frontmatter field at read time, failing the build with the file path and offending key. The custom `contentDate` union (`:20-30`) specifically handles the YAML gotcha where an unquoted `2026-05-20` parses as a `Date` but a typo parses as a string — and reports the offending value legibly, which `z.coerce.date()` does not.
- **`draft: true`** hides entries in production while leaving them visible in `next dev`.
- **`slugify()`** is applied on both sides of every tag comparison.
- **Resume is authored as TypeScript**, so the compiler is the validator — no runtime schema needed.
- **Content is flattened to plain serializable props** before crossing into `HomeScene` (`app/page.tsx:17-31`), so no content-layer type reaches the client bundle.
- **Canopy density is content-derived** — `density = min(1.8, 0.85 + published × 0.06)` (`app/page.tsx:35`). The tree literally grows as the portfolio grows. This is the best idea in the project.

**Current content:** 2 projects, 2 posts, 2 tags — all example files.

### 12.1 Gaps in the MDX rendering pipeline

`components/mdx.tsx` overrides 16 elements and is the entire prose system. What it does not handle:

1. **No syntax highlighting — MEDIUM.** `MDXRemote` runs with `options: { parseFrontmatter: false }` and nothing else: no `rehypePlugins`, no `remarkPlugins`. There is no `rehype-pretty-code`, no Shiki, no `rehype-highlight`. Every code block renders as flat `--text-dim` on `#040604`, with no token colors and no language label. For an engineering blog this is the single most visible content gap, and the palette to highlight *into* already exists — `--mid`, `--neon`, `--core`, `--text-faint` are a usable five-token code theme.
2. **No `h1` override — LOW.** An authored `# Heading` in any `.mdx` file falls through to a browser-default `<h1>`: unstyled Times-ish serif at 2em, and a second `<h1>` competing with the one `PageShell` already renders. Neither example file happens to use one, so it is latent. Either style it or map `h1 → h2`.
3. **Heading ids can collide — LOW.** `heading()` computes `slugify(toText(children))` (`mdx.tsx:32`) with no dedupe counter. Two headings reading "Results" in the same post emit two elements with `id="results"` — invalid HTML, and every anchor to it resolves to the first. A `Map` of seen slugs with a `-2` suffix is the standard fix.
4. **No `overflow-wrap` on prose — LOW.** A bare long URL or an unbroken identifier in a paragraph overflows the `max-w-[68ch]` reading column. `<pre>` and `<table>` are protected by their scroll containers; running text is not.
5. **Unhandled elements — LOW.** No `em`, `figure`/`figcaption`, `del`, or task-list-`input` overrides. `em` inherits acceptably; `figure` matters as soon as an image needs a caption, which is the same moment **PERF-5** (no image pipeline) comes due.

### 12.2 Content-surface findings

**Redundant dates on project pages — LOW.** `/projects/[slug]` renders the same date three times in three formats on one screen: the `PageShell` aside as `Mar 2026` (`:60`), the "Date" fact as `March 15, 2026` (`:83-86`), and a raw ISO `<time>` at the bottom of the rail as `2026-03-15` (`:117-119`). The third has no evident reader-facing purpose.

**Reading time is computed for projects and never shown — LOW.** `createCollection` computes `readingTimeMinutes` for every entry (`collection.ts:69`). `/blog/[slug]` surfaces it in the shell aside; `/projects/[slug]` discards it in favour of the date. Case studies are the longer documents of the two.

**Reading time counts markup as words — LOW.** `estimateReadingTime` (`collection.ts:20-24`) splits the raw MDX body on whitespace before any parsing, so fenced code, JSX tags, link syntax, and table pipes all count toward the 220-wpm total. A code-heavy post overstates its reading time, and it is the one number on the page a reader can check against their own experience.

**No prev/next or related-post navigation — LOW.** Both detail routes exit only through a single "← All posts" / "← All projects" link. Posts already carry tags, and `getPostTags()` already exists, so "more in this tag" is available from data the content layer exposes today.

**No table of contents — LOW.** Every MDX heading already emits a stable `id` and a `scroll-mt-24` offset. That infrastructure exists specifically so sections can be linked, and nothing links to them: there is no TOC, no in-page section list, and no reading-progress indicator. The expensive half is done.

**The `_` prefix convention is undocumented — LOW.** `listMdxFiles` skips any `.mdx` file whose name starts with `_` (`collection.ts:31`). It is a useful convention — a scratch draft that not even `next dev` should surface — but neither `AGENTS.md` nor `README.md` mentions it, so it exists only for whoever reads the loader.

**Empty states exist on both index pages** — `/projects:23-24` and `/blog:41-42` both render "Nothing published yet." `/blog/tags/[tag]` has none, but a tag page can only exist if a post carries that tag and `notFound()`s otherwise, so it is unreachable. Correct as-is.

---

## 13. Print & Alternate Rendering Modes

**There is not one `@media print` rule in the codebase.** No print stylesheet, no print-specific overrides in `globals.css`, no `print:` Tailwind variant anywhere in `app/` or `components/`. This section is entirely new to the second pass, and it produces the sharpest single number in the audit.

### 13.1 Why it matters here more than on most sites

`/resume` is in the primary nav. It is the page a recruiter prints, or hits ⌘P → *Save as PDF* on. And `content/schemas.ts:96` already declares `pdfPath?: string`, with `/resume:73-85` rendering a "Download PDF ↓" affordance when it is set. It is not set, and no PDF exists in `public/`. So today there is **no path at all** to a paper or PDF resume: no asset, and no print stylesheet to fall back on.

### 13.2 Measured: the palette inverts

Browsers do not print background colors by default (`print-color-adjust` defaults to `economy`, and every major browser ships the "Background graphics" checkbox off). The `#050805` ground disappears and the page prints on white — while every text token keeps its value, since nothing overrides them.

Contrast of each token against **white**, computed the same way as §5.2:

| Token | On `--bg` (screen) | On white (print) | Print verdict | What prints |
|---|---|---|---|---|
| `--core` `#c8ffdb` | 18.00:1 | **1.12:1** | ❌ Invisible | Role, company, institution names; MDX links; h2 |
| `--text` `#dcf5e4` | 17.47:1 | **1.15:1** | ❌ Invisible | Body copy, blockquotes, `<strong>` |
| `--neon` `#39ff14` | 14.84:1 | **1.36:1** | ❌ Invisible | Every node dot, focus ring, glow |
| `--text-dim` `#8fae99` | 8.32:1 | **2.42:1** | ❌ Fails | Summaries, highlights, all MDX `<p>` |
| `--text-faint` `#5d7566` | 4.03:1 | **5.00:1** | ✅ Passes AA | Dates, locations, counts |
| `--mid` `#1a7a3a` | 3.73:1 | **5.40:1** | ✅ Passes AA | Eyebrows, section labels, bullets |
| `--deep` `#0a3d1a` | 1.62:1 | 12.39:1 | ✅ (non-text) | Hairlines |

**The inversion is exact and worth stating plainly: the only two tokens that pass in print are the only two that fail on screen.** Every token carrying actual content — the headline, the summary, each role and company, every bullet — lands between 1.12:1 and 2.42:1. A printed `/resume` is a page of section labels and dates, with the substance rendered in near-white on white.

### 13.3 Structural problems beyond color

- **Fixed-position layers.** `PageShell:34-41` renders the radial-gradient aura as `pointer-events-none fixed inset-0 -z-10`, and `GrowthTree` is a fixed full-viewport canvas. `position: fixed` in paged media is undefined across engines — Chrome paints it on page 1 only, others repeat it on every sheet. Both need `print:hidden`.
- **Dark-only `color-scheme`.** `globals.css:48` pins `color-scheme: dark` on `html` with no print branch, so UA-styled elements stay dark-adapted against white paper.
- **The nav, footer, and skip link all print**, including "RSS" and the mailto — with URLs invisible, since no `a[href]::after { content: " (" attr(href) ")" }` rule exists to expose link targets on paper.
- **No page-break control.** No `break-inside: avoid` on the experience `<li>` items (`/resume:96`), so a role's title can print on one sheet and its highlights on the next.
- **The `<h1>` prints at `clamp(3rem, 9vw, 7.5rem)`** — `9vw` resolves against the print viewport, giving a headline near the 120px cap on a letter-width sheet.

A print stylesheet worth roughly 30 lines resolves all of it: force `--text`/`--text-dim`/`--core` to near-black, hide the two fixed layers and the chrome, cap the hero step, and add `break-inside: avoid`. That is a smaller job than producing and maintaining a separate PDF, and it makes ⌘P the supported path.

---

## 14. Input Modality: Hover, Touch & Keyboard Parity

The original pass audited *what* the interactions do. This section audits *who can trigger them*.

### 14.1 The whole accent vocabulary is hover-gated

**44 `hover:` utilities across `app/` and `components/`. Zero `@media (hover: hover)` guards. Zero `pointer: coarse` branches. Zero touch handlers.**

Every state change that distinguishes this design — the underline that draws itself, the node dot that lights and blooms, the title that lifts to `--core`, the card background wash, the tendril that completes, the `#` anchor that appears, and the canvas `surge()` that injects pulses into the tree — is bound to `:hover` and nothing else.

### 14.2 Two consequences

**Sticky hover on touch.** iOS Safari and Android Chrome emulate `:hover` on tap and hold it until the user taps elsewhere. Tapping a card on `/blog` leaves it in its hover state — dot lit, title at `--core`, background washed — after navigation intent has already been expressed. On the home page the effect is louder: `ItemCard`'s `highlight` also dispatches `growth-tree:surge`, so an incidental tap fires pulses into the canvas. Wrapping the hover rules in `@media (hover: hover)` is the standard guard and costs nothing on desktop.

**Touch users see a flatter site.** Nothing above is decorative — the node dots, the drawing underlines, and the tree surge *are* the design's argument. On a phone, none of it ever fires. Combined with **PERF-3** (the canvas runs at full cost behind a `w-full` scrim below `lg`) and the fact that tendrils are `lg:`-only, the mobile experience pays for the concept and displays comparatively little of it. That is the one place where the design's discipline and its delivery diverge.

**Keyboard users likewise.** Covered as **A11Y-9** — one `onFocus`/`onBlur` pair against 44 hover treatments.

### 14.3 WCAG 2.2 · SC 2.5.8 Target Size (Minimum), Level AA

The original pass scored against WCAG 2.1, where this criterion does not exist. Under 2.2 it does, and it is the one addition that changes the result.

The floor is 24×24 CSS px unless spacing or inline exceptions apply.

| Target | Padding | Approx. height | Verdict |
|---|---|---|---|
| Header nav links (`layout.tsx:85-91`) | none | ~19px (11.2px × 1.7) | ❌ Fails |
| Site-name link (`layout.tsx:76-81`) | none | ~19px | ❌ Fails |
| Footer links — Email, GitHub, LinkedIn, RSS (`layout.tsx:108-134`) | none | ~19px | ❌ Fails |
| Resume contact + social links (`/resume:48-85`) | none | ~19px | ❌ Fails |
| "← All posts" / "All projects" | none | ~19px | ❌ Fails |
| Tag chips (`blog/page.tsx:30`) | `px-3 py-1` | ~28px | ✅ Passes |
| List cards (`py-8 pl-8` block links) | large | ≫24px | ✅ Passes |

The spacing exception does not rescue the nav: header items sit at `gap-x-5` (20px) and footer items at `gap-x-5`/`gap-y-2` (8px vertical), so the 24px offset circles overlap. The inline exception does not apply either — these are standalone list items, not links flowing inside a sentence.

Every failing target is `.eyebrow` text with no padding. Adding `py-1.5` (or a `min-height` on the class) clears all of them at once, and — usefully — the same class is where the **A11Y-1** contrast fix lands. One rule, two criteria.

---

## 15. Tooling & Quality Gates

Not design, but it determines whether any fix in this document stays fixed.

| Gate | Status |
|---|---|
| Type checking | ✅ `npm run typecheck`, clean |
| Linting | ⚠️ Configured but unusable — see **PERF-6** |
| Formatting | ❌ No Prettier, no `format` script, no stylistic rules |
| Unit / component tests | ❌ None. No runner in `devDependencies` |
| E2E tests | ❌ None |
| Accessibility regression (axe / Lighthouse CI) | ❌ None |
| Visual regression | ❌ None |
| CI | ❌ No `.github/workflows/`, no pipeline of any kind |
| Bundle-size budget | ❌ None |

**Findings:**

1. **Nothing guards the contrast tokens.** §5.2 and §13.2 are both pure functions of seven hex values in one file. A ~20-line test asserting a minimum ratio for each token — against `--bg` for screen and against white for print — would convert the two highest-severity findings in this document into a permanent build gate. This is the highest value-per-line test available in the project.
2. **Nothing guards the frontmatter contract.** The zod schemas fail the build on invalid content, which is genuinely good — but only for content that exists. There is no test that a *valid* file parses, so a schema tightened later breaks silently until someone rebuilds with real content.
3. **`next.config.ts` is an empty stub.** No `images` configuration (needed the moment **PERF-5** is addressed), and `poweredByHeader` is left at its default. Response-header hardening is out of scope per this audit's framing, but the file being a placeholder is worth recording.
4. **No `.claude/` entry in `.gitignore`.** Root cause of **PERF-6** and of §5.1 finding 2 — both ESLint and Tailwind's content scanner walk the worktrees. One line fixes both.

---

## 16. Findings, Prioritised

### P0 — Blocks shipping

| # | Finding | Location |
|---|---|---|
| 1 | Social links point at `github.com/TODO` and `linkedin.com/in/TODO` — 404 on every page footer | `lib/site.ts:33-34` |
| 2 | Entire resume is placeholder TODO text, on a live, sitemapped route | `content/resume.ts` |
| 3 | No OG image; `summary_large_image` declared but unfulfilled — every shared link is a blank card | `app/layout.tsx:45-49` |
| 4 | Tagline is a `TODO` placeholder, rendered in the hero and the default `<title>` | `lib/site.ts:25` |
| 4b | **No print stylesheet — a printed `/resume` renders body copy at 1.15:1 and names at 1.12:1 on white.** No PDF asset either, so there is no route to a paper resume at all | `globals.css`, `public/` |

### P1 — Should fix before launch

| # | Finding | Location |
|---|---|---|
| 5 | `--mid` at **3.73:1** fails WCAG AA for all nav, footer, and section-label text at 11.2px | `globals.css:11, 61-67` |
| 6 | `--text-faint` at **4.03:1** fails AA for all dates/counts at 11.5px | `globals.css:18, 69-75` |
| 7 | No active-page indicator or `aria-current` in the nav | `app/layout.tsx:82-93` |
| 8 | No `error.tsx` / `global-error.tsx` — an unhandled render error shows the raw Next fallback | `app/` |
| 9 | Duplicate headings: sr-only `<h2>` + identical visible label; resume renders two real `<h2>`s per section | `home-scene.tsx:378,400`; `resume/page.tsx:89,149,187` |
| 10 | Default `create-next-app` favicon, no icon set, no manifest | `app/favicon.ico` |
| 11 | `min-h-[82vh]` should be `dvh` — hero overflows on mobile with browser chrome visible | `home-scene.tsx:293` |
| 12 | `npm run lint` is unusable: 13,649 findings, all from unignored `.claude/worktrees/` | `eslint.config.mjs:9-15` |
| 12a | Nav/footer/resume links fail **WCAG 2.2 SC 2.5.8** at ~19px against a 24px floor; same `.eyebrow` fix as #5 | `globals.css:61-67` |
| 12b | 44 `hover:` utilities with no `@media (hover: hover)` — hover sticks after tap on touch, and fires `growth-tree:surge` incidentally | throughout |
| 12c | Hover states have no focus equivalent; the MDX heading `#` anchor is focusable but stays `opacity-0` on keyboard focus | `mdx.tsx:37-41` + 40 sites |
| 12d | `<pre>` and `<table>` scroll containers lack `tabIndex={0}` — unreachable by keyboard (WCAG 2.1.1) | `mdx.tsx:99-110` |
| 12e | No `viewport` export → no `theme-color`; mobile browser chrome frames the dark page in light | `app/layout.tsx` |
| 12f | No syntax highlighting in MDX — no rehype/remark plugins configured at all | `mdx.tsx:150-154` |

### P2 — Design-system debt

| # | Finding | Location |
|---|---|---|
| 13 | `@theme inline` color mapping is used **zero** times in source — but `--font-mono` **is** live, so the block cannot simply be deleted | `globals.css:32-44` |
| 13a | Tailwind scans `FRONTEND-AUDIT.md` and `.claude/worktrees/`; this document's own prose emits `.text-neon`, `.bg-mid`, `.border-deep` into production CSS. Fix in `.gitignore`, which also fixes #12 | `.gitignore` |
| 14 | `QuietLink` is exported and never imported; its markup is copy-pasted into 7 places | `page-shell.tsx:72` |
| 14a | `QuietLink` renders a bare `<a>` — adopting it as written would break client-side routing on 5 of its 7 call sites | `page-shell.tsx:84` |
| 15 | `/blog` and `/blog/tags/[tag]` share 30 lines of identical, un-extracted card markup | both files |
| 16 | Palette hex values duplicated between `globals.css` and `GROWTH_TREE_PALETTE` | `growth-tree.tsx:31-37` |
| 17 | No image pipeline — zero `next/image`; MDX `<img>` is raw, unsized, unoptimised | `mdx.tsx:121-124` |
| 18 | No spacing, radius, or duration tokens; six ad-hoc measure values | throughout |
| 19 | Unused starter SVGs shipping in `public/` | `public/*.svg` |
| 20 | `--bg-raised` token has exactly one usage | `globals.css:9` |
| 21 | Untokenized `bg-[#040604]` for code blocks | `mdx.tsx:101` |
| 22 | No JSON-LD structured data | — |
| 23 | Footer copyright year freezes at build time | `layout.tsx:104` |
| 24 | Click-to-replant is entirely undiscoverable and irreversible | `growth-tree.tsx:1038-1051` |
| 25 | No `loading.tsx`; no pagination or search on `/blog` (fine at 2 posts, won't scale) | `app/` |
| 26 | `/feed.xml` is dynamic despite fully static inputs | `app/feed.xml/route.ts` |
| 27 | Only two breakpoints (`sm`, `lg`); 640–1024px gets desktop padding with mobile layout | throughout |
| 28 | Fonts load unrestricted variable axes; three families on first paint | `layout.tsx:8-26` |
| 29 | No tests, no CI, no bundle budget, no formatter — nothing guards any fix in this document | §15 |
| 30 | No `::selection` style; no `forced-colors` or `prefers-contrast` handling; no `text-wrap: balance`/`pretty` | `globals.css` |
| 31 | MDX: no `h1` override, heading ids can collide, no `overflow-wrap` on prose, no `figure`/`figcaption` | `mdx.tsx` |
| 32 | `og:locale` emits `en` where Open Graph specifies `language_TERRITORY`; one field serves three contracts | `lib/site.ts:29` |
| 33 | 404 is indexable, inherits the default title, and hardcodes its nav instead of using `site.nav` | `app/not-found.tsx` |
| 34 | Content schemas have no `cover`/`image` field — blocks per-post OG cards and case-study heroes | `schemas.ts:32-58` |
| 35 | Sitemap static and tag routes carry no `lastModified`, though both are derivable | `app/sitemap.ts` |
| 36 | `<article>` and the project facts `<aside>` are unnamed landmarks | both detail routes |
| 37 | Project date renders three times in three formats; reading time computed for projects but never shown | `projects/[slug]/page.tsx` |
| 38 | Reading time counts code fences and JSX as words | `collection.ts:20-24` |
| 39 | No prev/next or related posts; no TOC despite heading ids already existing for it | `blog/[slug]`, `mdx.tsx` |
| 40 | The `_`-prefix draft-skip convention is undocumented | `collection.ts:31` |
| 41 | `next.config.ts` is an empty stub — no `images` config ahead of #17 | `next.config.ts` |

---

## 17. What's Genuinely Good

Worth stating plainly, because the findings list above is long and the underlying work is strong:

1. **Conceptual coherence.** A tree/growth/bioluminescence metaphor carried consistently through the canvas, the node dots, the spine borders, the tendril SVGs, the drawing underlines, the "Scroll to climb" cue, and the 404's "Nothing grew here." Nothing in the UI is off-concept.
2. **The content-driven canopy.** `density` derived from published item count means the background art literally grows as the portfolio grows. That is the kind of idea that justifies a bespoke canvas.
3. **Motion discipline.** 39 of 39 CSS transitions use the same `cubic-bezier(0.16, 1, 0.3, 1)`, mirrored exactly in the JS constant. Load-sequence timings are extracted into a documented constant object rather than sprinkled as magic numbers.
4. **Reduced-motion handling at four layers**, including fast-forwarding the canvas simulation to a settled state rather than freezing it mid-growth.
5. **The `<noscript>` reveal fallback.** Recognising that `initial={{ opacity: 0 }}` prerenders into the HTML and would leave non-JS users with a blank page is a level of care most sites skip.
6. **The `tree-events.ts` decoupling.** Using a window event instead of a direct import specifically to preserve the `ssr:false` code split — with the reasoning written down — is the correct call and the correct documentation of it.
7. **Canvas performance engineering.** Frame capping with scroll back-off, per-depth path batching, alpha-tier particle bucketing, backdrop baking on resize, one-way adaptive bloom degradation, cached scroll range to avoid forced reflow, and a geometric fallback for the IntersectionObserver first-callback edge case. Every one of these is commented with *why*.
8. **The comments explain reasoning, not mechanics.** `growth-tree.tsx:404-407` explains why the angular cone exists (gravitropism alone can't hold ±branchSpread per level, chains spiral). `home-scene.tsx:189-191` explains why `willChange` is set. `schemas.ts:15-19` explains the YAML date trap. This is the kind of commenting that survives contact with a future maintainer.
9. **Server/client boundary is clean.** Content types never reach the client. Seven of eight routes ship no interactive JS. The one client route flattens everything to plain serializable props first.
10. **Accessibility fundamentals are present** — skip link, high-contrast focus ring, `aria-hidden` on 20+ decorative elements, semantic `<time>`, `aria-labelledby` on every section, `rel="noopener noreferrer"` on all 8 external links. The failures are in color values, not in structure.

---

## 18. Suggested Order of Work

**Half a day, unblocks launch:**
Fill in `lib/site.ts` socials + tagline → write the real `content/resume.ts` → add `app/opengraph-image.tsx` → replace the favicon → delete the starter SVGs → add `.claude/` to **`.gitignore`** (this fixes ESLint *and* Tailwind's content scanner; the `globalIgnores` edit alone leaves the phantom CSS in place).

**One day, fixes the audit's substantive issues:**
Lift `--mid` to ~`#2fa855` and `--text-faint` to ~`#7d9686`, then re-verify at 4.5:1 → **add `py-1.5` to `.eyebrow` in the same edit, clearing SC 2.5.8 at ~28px** → add `aria-current="page"` + a visual active state to the nav → remove the duplicate sr-only headings → `vh` → `dvh` → add `app/error.tsx`.

**Half a day, the two modes nobody tested:**
Write the ~30-line print stylesheet (force text tokens to near-black, `print:hidden` on both fixed layers and the site chrome, cap `--step-hero`, `break-inside: avoid` on resume entries) → wrap the 44 hover rules in `@media (hover: hover)` → pair `hover:` with `focus-visible:` and `group-hover:` with `group-focus-within:`, starting with the invisible `#` anchor in `mdx.tsx` → add `tabIndex={0}` + `role="region"` + `aria-label` to the `<pre>` and `<table>` containers → add the `viewport` export with `themeColor` and `colorScheme`.

**One afternoon, the highest-leverage test in the project:**
A ~20-line contrast test over the seven color tokens — minimum ratio against `--bg` for screen, against white for print — plus a CI workflow running `typecheck`, `lint`, `build`, and that test. It converts the two most severe findings in this document into a gate that cannot silently regress.

**Ongoing, pays down design-system debt:**
Keep `--font-mono` and drop the rest of `@theme`, or migrate `mdx.tsx`'s two `font-mono` classes first → fix `QuietLink` to branch on internal vs. external, *then* use it in the seven places that reimplement it → extract a shared `<PostList>` → add spacing/radius/duration tokens → add `cover`/`image` to the content schemas **before** writing real content → set up `next/image` and a rehype syntax-highlighting plugin before the first screenshot and the first code-heavy post land.
