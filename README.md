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
├── app/                    # Routing (App Router) + global shell & styles
│   ├── layout.tsx          #   sticky sidebar shell, fonts, wraps every page
│   ├── page.tsx            #   home page — stacks the sections
│   └── globals.css         #   Tailwind import, design tokens (@theme), custom utilities
├── components/
│   ├── layout/             #   Sidebar
│   ├── sections/           #   Hero, CaseStudies, Footer (the page bands)
│   └── ui/                 #   NavLink, Stat, CaseStudyCard (small reusable pieces)
└── lib/
    └── content.ts          # All page copy as data — edit here to change content

learn/                      # Deep-dive docs explaining non-trivial implementations
public/                     # Static assets
```

**Mental model:** `app/` = pages & routing · `components/` = reusable building blocks · `lib/` = content/data · `learn/` = write-ups.

## Notable implementation details

- **Content-driven** — all copy lives in `src/lib/content.ts`; components render from it, so adding a case study or link is a data edit, not a layout edit.
- **Design tokens** — colours and fonts are defined once in `globals.css` (`@theme`) and referenced everywhere (`bg-page`, `text-textPrimary`, etc.).
- **Custom dashed hairlines** — the exact 10px/10px dashes from the design can't be done with `border-dashed` (the browser controls dash length), so they're painted with a small, composable background-gradient utility system. Full walkthrough in [`learn/dashed-borders.md`](learn/dashed-borders.md).
- **Spring hover interactions** — the case-study cards and sidebar links animate with a spring easing (`--ease-spring-gentle`) sampled from Figma. Walkthrough in [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md).

## Status

Desktop-only for now; responsive layouts are planned.

## Learn docs

The [`learn/`](learn/) folder documents the trickier pieces line-by-line — the reasoning behind the code and, where relevant, the debugging story:

- [`learn/dashed-borders.md`](learn/dashed-borders.md) — the dashed-hairline system and the CSS variable-inheritance bug behind it.
- [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md) — the spring-based hover reveal (title slide + description fade).
