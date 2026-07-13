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
