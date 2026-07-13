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
│   ├── page.tsx                  #   home page — stacks the sections
│   ├── globals.css               #   Tailwind import, design tokens (@theme), custom utilities
│   ├── @modal/                   #   parallel-route slot for the case-study overlay
│   │   ├── default.tsx           #     slot fallback (renders nothing)
│   │   └── (.)work/[slug]/       #     intercepts a card click → overlay over the home page
│   └── work/[slug]/              #   standalone case-study page (direct load / shared link)
├── components/
│   ├── Clarity.tsx               #   Microsoft Clarity init (mounted once in layout.tsx)
│   ├── layout/                   #   Sidebar (desktop + 600-900px tablet pill), MobileNavPill (<600px, collapsible)
│   ├── sections/                 #   Hero, CaseStudies, Footer (the page bands)
│   ├── ui/                       #   NavLink, Stat, CaseStudyCard (small reusable pieces)
│   └── case-study/               #   CaseStudyDetail (shared card), CaseStudyOverlay, BackNav
└── lib/
    ├── content.ts                # Page copy (identity, nav, hero) as data
    └── case-studies/             # Case-study content module — typed schema, one file per study

learn/                            # Deep-dive docs explaining non-trivial implementations
public/                           # Static assets (incl. theme-aware favicons)
next.config.ts                    # PostHog reverse-proxy rewrites (/ingest/* -> PostHog US Cloud)
```

**Mental model:** `app/` = pages & routing · `components/` = reusable building blocks · `lib/` = content/data · `learn/` = write-ups.

## Notable implementation details

- **Content-driven** — page copy lives in `src/lib/content.ts` and case studies in the typed `src/lib/case-studies/` module (one file per study + a barrel `index.ts`); components render from that data, so adding a case study or link is a data edit, not a layout edit.
- **URL-addressable case-study modal** — clicking a "Selected work" card opens the study as an overlay over the home page with its own URL (`/work/<slug>`), so it's shareable and the browser Back button closes it; loading that URL directly renders a full standalone page. Built with Next.js parallel + intercepting routes. Full walkthrough in [`learn/case-study-modal.md`](learn/case-study-modal.md).
- **Design tokens** — colours and fonts are defined once in `globals.css` (`@theme`) and referenced everywhere (`bg-page`, `text-textPrimary`, etc.).
- **Custom dashed hairlines** — the exact 10px/10px dashes from the design can't be done with `border-dashed` (the browser controls dash length), so they're painted with a small, composable background-gradient utility system. Full walkthrough in [`learn/dashed-borders.md`](learn/dashed-borders.md).
- **Spring hover interactions** — the case-study cards and sidebar links animate with a spring easing (`--ease-spring-gentle`) sampled from Figma. Walkthrough in [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md).
- **Theme-aware favicons** — the browser tab icon switches with the OS/browser colour scheme via `prefers-color-scheme` (light/dark PNGs wired through the Next.js Metadata API in `layout.tsx`).
- **Fully responsive, three tiers** — ≥900px (desktop, sticky sidebar), 600-900px (sidebar becomes an always-expanded bottom pill), <600px (`MobileNavPill`, a collapsible identity+chevron pill; fluid/fill-width below 402px, no extra breakpoint needed). Breakpoint math and the reasoning behind each threshold (600px, not the Figma design's nominal 480/402px, is an arithmetic-forced floor — see `snap-center-x` in `globals.css`) are documented inline at each tier.
- **Bottom-nav transitions animate, not snap** — crossing the 900px/600px breakpoints plays a slide-up-from-below entrance on whichever pill takes over (a CSS `@keyframes` scoped to each pill's own media query — `position:sticky↔fixed` and `display:none↔flex` can't be `transition`-animated directly, so `animation` is used instead, since it plays on any `animation-name` change, media-query-driven or not). Opening a case study slides `BackNav` in/out in sync with the card, reusing `CaseStudyOverlay`'s existing `open` state.
- **Analytics run production-only** — both Clarity (`src/components/Clarity.tsx`) and PostHog (`src/instrumentation-client.ts`) no-op under `pnpm dev`, so local testing never pollutes real visitor data. PostHog is proxied through this site's own domain (`/ingest/*`, see `next.config.ts`) rather than calling posthog.com directly, since ad-blockers commonly block the latter but not same-origin traffic.

## Status

Fully responsive (desktop down to any viewport width) and deployed with analytics. See [Environment variables](#environment-variables) before deploying — Clarity/PostHog need their keys set on the hosting provider, not just locally.

## Learn docs

The [`learn/`](learn/) folder documents the trickier pieces line-by-line — the reasoning behind the code and, where relevant, the debugging story:

- [`learn/dashed-borders.md`](learn/dashed-borders.md) — the dashed-hairline system and the CSS variable-inheritance bug behind it.
- [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md) — the spring-based hover reveal (title slide + description fade).
- [`learn/case-study-modal.md`](learn/case-study-modal.md) — the URL-addressable case-study overlay: parallel + intercepting routes, the content schema, backdrop, and animation.
- [`learn/focus-visible-outline.md`](learn/focus-visible-outline.md) — the stray focus-ring-on-close bug and the focus-management fix (`:focus-visible`).
