# arshkaushik.com

Personal portfolio for **Arsh Kaushik**, implemented from a Figma design.

## Tech stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4** — CSS-first config via `@theme` in `globals.css` (no `tailwind.config` file)
- **pnpm**
- Fonts via `next/font`: **Instrument Serif** (display) + **Geist** (UI)
- Analytics: **Microsoft Clarity** + **PostHog** — both running side by side (session replay + heatmaps in each) to compare before picking one long-term

## Getting started

```bash
pnpm install
pnpm dev        # dev server at http://localhost:3000
```

Other scripts:

```bash
pnpm build      # production build
pnpm start      # serve the production build
pnpm lint       # ESLint
pnpm thumbs     # render exact-size WebP thumbnails from the SVG masters
                # (tooling kept for a future page-weight pass — the app ships inline SVG today)
```

### Environment variables

Analytics are gated to production only (see `src/components/Clarity.tsx` /
`src/instrumentation-client.ts`), so none of this is required for `pnpm dev` —
only for a production build/deploy to actually report data. Create a
`.env.local` (gitignored) with:

```bash
NEXT_PUBLIC_CLARITY_PROJECT_ID=<clarity project id>
NEXT_PUBLIC_POSTHOG_KEY=<posthog project api key, phc_...>
NEXT_PUBLIC_POSTHOG_HOST=/ingest   # relative — proxied by next.config.ts, not posthog.com directly
```

## Project structure

```
src/
├── instrumentation-client.ts     # PostHog init (Next.js's client-instrumentation convention — no component needed)
├── app/                          # Routing (App Router) + global shell & styles
│   ├── layout.tsx                #   sidebar shell, fonts, theme favicons, @modal slot, Clarity
│   ├── page.tsx                  #   home page — re-exports HomeContent
│   ├── not-found.tsx             #   branded 404 (dashed surface card, serif "404")
│   ├── opengraph-image.tsx       #   build-time og:image for the root URL (next/og)
│   ├── robots.ts / sitemap.ts    #   crawler rules + sitemap, sourced from the caseStudies module
│   ├── globals.css               #   Tailwind import, design tokens (@theme), custom utilities
│   ├── @modal/                   #   parallel-route slot for the case-study overlay
│   │   ├── default.tsx           #     slot fallback (renders nothing)
│   │   └── (.)work/[slug]/       #     intercepts a card click → overlay over the home page
│   └── work/[slug]/              #   direct load / refresh / shared link — renders HomeContent
│                                  #   dimmed behind CaseStudyOverlay, same look as the soft-nav case;
│                                  #   + per-study opengraph-image.tsx (build-time og:images ×3)
├── components/
│   ├── Clarity.tsx               #   Microsoft Clarity init (mounted once in layout.tsx)
│   ├── layout/                   #   Sidebar (route-aware, desktop + 600-900px tablet pill), MobileNavPill (<600px, collapsible)
│   ├── sections/                 #   Hero, CaseStudies, Footer, HomeContent (composes the three, reused by both routes above)
│   ├── ui/                       #   NavLink, Stat, CaseStudyCard (small reusable pieces)
│   └── case-study/               #   CaseStudyDetail (shared card), CaseStudyOverlay, BackNav
└── lib/
    ├── content.ts                # Page copy (identity, nav, hero) as data
    ├── inline-svg.ts             # Reads a trusted local SVG for inline embedding (avoids next/image's mobile-blur bug)
    ├── og-fonts.ts               # Build-time Google-Fonts fetch for the og:images (satori can't read next/font files)
    └── case-studies/             # Case-study content module — typed schema, one file per study

learn/                            # Deep-dive docs explaining non-trivial implementations
scripts/                          # render-thumbnails.mjs — `pnpm thumbs` raster tooling (unused by the running app)
public/                           # Static assets (incl. theme-aware favicons)
next.config.ts                    # PostHog reverse-proxy rewrites (/ingest/* -> PostHog US Cloud)
```

**Mental model:** `app/` = pages & routing · `components/` = reusable building blocks · `lib/` = content/data · `learn/` = write-ups.

## Notable implementation details

- **Content-driven** — page copy lives in `src/lib/content.ts` and case studies in the typed `src/lib/case-studies/` module (one file per study + a barrel `index.ts`); components render from that data, so adding a case study or link is a data edit, not a layout edit.
- **URL-addressable case-study modal** — clicking a "Selected work" card opens the study as an overlay over the home page with its own URL (`/work/<slug>`), so it's shareable and the browser Back button closes it; loading that URL directly (or refreshing mid-view) renders the same dimmed-home-behind-the-card look, closing via a real navigation instead of browser history. Built with Next.js parallel + intercepting routes. Full walkthrough in [`learn/case-study-modal.md`](learn/case-study-modal.md), with the direct-load/refresh behavior and the two navigation bugs behind it in [`learn/case-study-refresh-behavior.md`](learn/case-study-refresh-behavior.md).
- **Design tokens** — colours and fonts are defined once in `globals.css` (`@theme`) and referenced everywhere (`bg-page`, `text-textPrimary`, etc.).
- **Custom dashed hairlines** — the exact 10px/10px dashes from the design can't be done with `border-dashed` (the browser controls dash length), so they're painted with a small, composable background-gradient utility system. Full walkthrough in [`learn/dashed-borders.md`](learn/dashed-borders.md).
- **Spring hover interactions** — the case-study cards and sidebar links animate with a spring easing (`--ease-spring-gentle`) sampled from Figma. Walkthrough in [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md).
- **Theme-aware favicons** — the browser tab icon switches with the OS/browser colour scheme via `prefers-color-scheme` (light/dark PNGs wired through the Next.js Metadata API in `layout.tsx`).
- **Inline SVG thumbnails, not `next/image`** — the case-study thumbnails are large, hand-illustrated SVGs, rendered as inline `<svg>` markup (`src/lib/inline-svg.ts`) because that's the only pipeline that stays pixel-crisp on every engine, DPR, zoom level, and scaled display. This survived a full experiment cycle: `<img>`-tag SVG measurably blurs on WebKit, and a later exact-size WebP pipeline was provably 1:1 yet still read softer than native vector paint — so vectors won on visual quality, by explicit call. The inlined files are SVGO-optimized (~70% smaller than the raw Figma exports; home HTML ≈ 2.9 MB raw / 538 KB gzipped is the accepted trade, with the raster tooling kept in `scripts/` for a future weight pass). Three-act saga in [`learn/svg-thumbnail-blur.md`](learn/svg-thumbnail-blur.md); line-by-line code walkthrough in [`learn/inline-svg-thumbnails-explained.md`](learn/inline-svg-thumbnails-explained.md).
- **Social-share ready** — `metadataBase` + Open Graph/Twitter tags in `layout.tsx`, per-study `generateMetadata`, and **og:images generated at build time** via the `opengraph-image.tsx` file convention (`next/og`; fonts fetched at build by `src/lib/og-fonts.ts`, try/caught so offline builds fall back instead of failing) — plus `sitemap.ts` and `robots.ts` sourced from the same case-study data the pages render from.
- **Accessibility hardened** — the case-study dialog is a real focus trap (`inert` applied to everything outside it, correct in both its DOM shapes), collapsed mobile-nav links leave the tab order (`inert`), the home page has a true h1 → h2 → h3 outline, backdrop-close ignores text-selection drags and scrollbar clicks, closing a hard-loaded study doesn't pollute Back-button history (`router.replace`), and bad URLs land on a branded 404 (`not-found.tsx`).
- **Fully responsive, three tiers** — see the dedicated [Responsive design](#responsive-design) section below for the breakpoints, why they land where they do, and the mechanism behind each one.
- **Analytics run production-only** — both Clarity (`src/components/Clarity.tsx`) and PostHog (`src/instrumentation-client.ts`) no-op under `pnpm dev`, so local testing never pollutes real visitor data. PostHog is proxied through this site's own domain (`/ingest/*`, see `next.config.ts`) rather than calling posthog.com directly, since ad-blockers commonly block the latter but not same-origin traffic.

## Responsive design

The layout is fully responsive across **three breakpoint tiers**, built and verified as three separate phases against Figma references at each width — not one flat mobile-first pass — because the design changes *mechanism*, not just size, at each tier.

### The three tiers

| Width | What changes | Key file(s) |
|---|---|---|
| **≥900px** | True desktop: a fixed 260px sidebar, `position: sticky` in the flex row alongside a fixed 600px content column | `Sidebar.tsx` |
| **600–900px** | The sidebar becomes a `position: fixed`, always-expanded bottom pill (identity + all 4 links in one row); the content column goes full-bleed | `Sidebar.tsx` — same component, `min-[600px]:`/`min-[900px]:` variants |
| **<600px** | The pill collapses further to identity + a tappable chevron, links hidden until expanded; case-study cards and the detail view switch from fixed-height to auto-height layouts | `MobileNavPill.tsx`, `CaseStudyCard.tsx`, `CaseStudyDetail.tsx` |

Below 402px (Figma's actual reference width for the mobile tier) there's no fourth breakpoint — every measurement in the `<600px` tier is already expressed as `calc(100% - Npx)` / `w-full` rather than a fixed pixel value, so it keeps scaling correctly on narrower phones with no extra code.

### Why 600px, and not Figma's nominal 480/402px

Figma's own design intent puts the mobile-tier handoff at 480px (drawn at a 402px reference, meant to fill up to 480). But `main`'s wider tier is a literal `width: 600px`, and a 600px-wide box cannot fit inside a container narrower than 600px — that's arithmetic, not a design choice. Verified empirically: at exactly 596px there's no overflow; at 595px there is (the real floor, driven by `main`'s 600px column plus Hero's fixed 548px tagline). Every "restore the wider tier" breakpoint in this codebase (`Sidebar`, `MobileNavPill`, `CaseStudyCard`, `CaseStudyDetail`, `Hero`, `content.ts`) uses 600px consistently for this reason — see the comment on `snap-center-x` in `globals.css` for the full derivation.

### Mechanism, tier by tier

- **Sidebar → bottom pill → collapsible pill.** `Sidebar.tsx` owns the whole `≥600px` range as one component (`min-[900px]:` variants swap it between a `fixed` bottom pill and a sticky in-flow column); `MobileNavPill.tsx` is a separate `"use client"` component for `<600px` — the first genuinely interactive state in the layout (a chevron button toggling the links panel). Its open/close animation uses `grid-template-rows: 0fr ↔ 1fr`, the standard CSS-only way to animate to/from an intrinsic "auto" height with no JS measurement.
- **Case-study cards.** At `≥600px` the description sits `absolute` beneath a fixed-height title box (permanently revealed at 600–900px, hover-gated at 900px+); below 600px it's plain auto-height flow (`order-first`/`order-last` fixes the visual reading order without touching DOM order, which the wider tiers' hover mechanics still depend on).
- **Case-study detail.** The thumbnail uses `aspect-[736/394]` instead of a fixed pixel height (verified mathematically identical to the old desktop value, and correct at every width in between); the metadata table stacks label-above-value below 600px instead of side-by-side.
- **Hero.** The tagline drops its fixed 548px width below 600px; the stats row switches `flex-row` → `flex-col` (a real fix, not just fidelity — the fixed-width cells would otherwise squeeze the flexible first cell down to near-zero at in-between widths).

### Animated breakpoint transitions

Crossing the 900px/600px thresholds used to be an instant snap — pure CSS media-query swaps of `position` (`sticky ↔ fixed`) and `display` (`none ↔ flex`), neither of which a CSS `transition` can animate (there's no continuous value to interpolate between). Both pills now play a slide-up-from-below entrance instead, via a CSS `@keyframes` scoped to each pill's own media query in `globals.css` — an `animation` (unlike a `transition`) plays from scratch the instant `animation-name` starts applying to an element, regardless of what caused that, media query included. Opening a case study slides `BackNav` in sync with the card, reusing `CaseStudyOverlay`'s existing `open` boolean rather than a second animation state.

## Status

**Live at [arshkaushik.com](https://arshkaushik.com)** — deployed on Vercel (DNS via Cloudflare), fully responsive across all three breakpoint tiers, with Clarity + PostHog analytics running in production.

## Learn docs

The [`learn/`](learn/) folder documents the trickier pieces line-by-line — the reasoning behind the code and, where relevant, the debugging story:

- [`learn/dashed-borders.md`](learn/dashed-borders.md) — the dashed-hairline system and the CSS variable-inheritance bug behind it.
- [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md) — the spring-based hover reveal (title slide + description fade).
- [`learn/case-study-modal.md`](learn/case-study-modal.md) — the URL-addressable case-study overlay: parallel + intercepting routes, the content schema, backdrop, and animation.
- [`learn/focus-visible-outline.md`](learn/focus-visible-outline.md) — the stray focus-ring-on-close bug and the focus-management fix (`:focus-visible`).
- [`learn/svg-thumbnail-blur.md`](learn/svg-thumbnail-blur.md) — the three-act thumbnail-blur saga: `<img>`-SVG blur on WebKit → the exact-size WebP raster experiment → why inline `<svg>` won on visual quality.
- [`learn/inline-svg-thumbnails-explained.md`](learn/inline-svg-thumbnails-explained.md) — junior-dev-level walkthrough of the final thumbnail code vs. the raster era: the server/client boundary and `fs`, `dangerouslySetInnerHTML`, `preserveAspectRatio`, `srcset`/`sizes`, and a gotchas checklist.
- [`learn/case-study-refresh-behavior.md`](learn/case-study-refresh-behavior.md) — the "no way back to home" bug after refreshing mid-case-study, the desktop/mobile navigation fixes, and the redesign that makes a direct load look like the soft-nav overlay.
