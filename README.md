# arshkaushik.com

Personal portfolio for **Arsh Kaushik**, implemented from a Figma design.

## Tech stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4** — CSS-first config via `@theme` in `globals.css` (no `tailwind.config` file)
- **pnpm**
- Fonts via `next/font`: **Instrument Serif** (display) + **Geist** (UI)

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

## Project structure

```
src/
├── app/                          # Routing (App Router) + global shell & styles
│   ├── layout.tsx                #   sidebar shell, fonts, theme favicons, @modal slot
│   ├── page.tsx                  #   home page — stacks the sections
│   ├── globals.css               #   Tailwind import, design tokens (@theme), custom utilities
│   ├── @modal/                   #   parallel-route slot for the case-study overlay
│   │   ├── default.tsx           #     slot fallback (renders nothing)
│   │   └── (.)work/[slug]/       #     intercepts a card click → overlay over the home page
│   └── work/[slug]/              #   standalone case-study page (direct load / shared link)
├── components/
│   ├── layout/                   #   Sidebar
│   ├── sections/                 #   Hero, CaseStudies, Footer (the page bands)
│   ├── ui/                       #   NavLink, Stat, CaseStudyCard (small reusable pieces)
│   └── case-study/               #   CaseStudyDetail (shared card) + CaseStudyOverlay
└── lib/
    ├── content.ts                # Page copy (identity, nav, hero) as data
    └── case-studies/             # Case-study content module — typed schema, one file per study

learn/                            # Deep-dive docs explaining non-trivial implementations
public/                           # Static assets (incl. theme-aware favicons)
```

**Mental model:** `app/` = pages & routing · `components/` = reusable building blocks · `lib/` = content/data · `learn/` = write-ups.

## Notable implementation details

- **Content-driven** — page copy lives in `src/lib/content.ts` and case studies in the typed `src/lib/case-studies/` module (one file per study + a barrel `index.ts`); components render from that data, so adding a case study or link is a data edit, not a layout edit.
- **URL-addressable case-study modal** — clicking a "Selected work" card opens the study as an overlay over the home page with its own URL (`/work/<slug>`), so it's shareable and the browser Back button closes it; loading that URL directly renders a full standalone page. Built with Next.js parallel + intercepting routes. Full walkthrough in [`learn/case-study-modal.md`](learn/case-study-modal.md).
- **Design tokens** — colours and fonts are defined once in `globals.css` (`@theme`) and referenced everywhere (`bg-page`, `text-textPrimary`, etc.).
- **Custom dashed hairlines** — the exact 10px/10px dashes from the design can't be done with `border-dashed` (the browser controls dash length), so they're painted with a small, composable background-gradient utility system. Full walkthrough in [`learn/dashed-borders.md`](learn/dashed-borders.md).
- **Spring hover interactions** — the case-study cards and sidebar links animate with a spring easing (`--ease-spring-gentle`) sampled from Figma. Walkthrough in [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md).
- **Theme-aware favicons** — the browser tab icon switches with the OS/browser colour scheme via `prefers-color-scheme` (light/dark PNGs wired through the Next.js Metadata API in `layout.tsx`).

## Status

Desktop-only for now; responsive layouts are planned.

## Learn docs

The [`learn/`](learn/) folder documents the trickier pieces line-by-line — the reasoning behind the code and, where relevant, the debugging story:

- [`learn/dashed-borders.md`](learn/dashed-borders.md) — the dashed-hairline system and the CSS variable-inheritance bug behind it.
- [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md) — the spring-based hover reveal (title slide + description fade).
- [`learn/case-study-modal.md`](learn/case-study-modal.md) — the URL-addressable case-study overlay: parallel + intercepting routes, the content schema, backdrop, and animation.
- [`learn/focus-visible-outline.md`](learn/focus-visible-outline.md) — the stray focus-ring-on-close bug and the focus-management fix (`:focus-visible`).
