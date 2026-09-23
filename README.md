# arshkaushik.com

Personal portfolio for **Arsh Kaushik**, implemented from a Figma design.

## Tech stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **pnpm**
- Fonts via `next/font`: **Instrument Serif** (display) + **Geist** (UI)
- Analytics: **Microsoft Clarity** + **PostHog**

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
├── instrumentation-client.ts     # PostHog init (Next.js's client-instrumentation convention — no component needed)
├── app/                          # Routing (App Router) + global shell & styles
│   ├── layout.tsx                #   sidebar shell, fonts, theme favicons, @modal slot, Clarity
│   ├── page.tsx                  #   home page — re-exports HomeContent
│   ├── not-found.tsx             #   branded 404 (dashed surface card, serif "404")
│   ├── opengraph-image.png       #   the designed og:image for the root URL (static, 1200x630)
│   ├── robots.ts / sitemap.ts    #   crawler rules + sitemap, sourced from the caseStudies module
│   ├── llms.txt/route.ts         #   /llms.txt — a plain-text brief of the site, for AI tools
│   ├── globals.css               #   Tailwind import, design tokens (@theme), custom utilities
│   ├── @modal/                   #   parallel-route slot for the case-study overlay
│   │   ├── default.tsx           #     slot fallback (renders nothing)
│   │   └── (.)work/[slug]/       #     intercepts a card click → overlay over the home page
│   └── work/[slug]/              #   direct load / refresh / shared link — renders HomeContent
│                                  #   dimmed behind CaseStudyOverlay, same look as the soft-nav case;
│                                  #   + per-study opengraph-image.tsx (generated og:images ×3)
├── components/
│   ├── Clarity.tsx               #   Microsoft Clarity init (mounted once in layout.tsx)
│   ├── layout/                   #   Sidebar (route-aware, desktop + 600-900px tablet pill), MobileNavPill (<600px, collapsible)
│   ├── sections/                 #   Hero, CaseStudies, Footer, HomeContent (composes the three, reused by both routes above)
│   ├── JsonLd.tsx                #   renders a JSON-LD <script>; the only <script> in the codebase
│   ├── ui/                       #   NavLink, Stat, CaseStudyCard (small reusable pieces)
│   └── case-study/               #   CaseStudyDetail (shared card + point cards), CaseStudyOverlay, BackNav
└── lib/
    ├── content.ts                # Page copy (identity, nav, hero) as data
    ├── og-fonts.ts               # Build-time Google-Fonts fetch for the per-study og:images (satori cannot read next/font files)
    ├── structured-data.ts        # schema.org JSON-LD (Person / WebSite / CreativeWork), built from the content modules
    └── case-studies/             # Case-study content module — typed schema, one file per study

learn/                            # Deep-dive docs explaining non-trivial implementations
└── assets/                       #   Screenshots referenced by those docs (not served to visitors)
public/                           # Static assets — all of it referenced; nothing dead is deployed
├── thumbnails/<study>.webp       #   Case-study thumbnails, 2208×1184 (home card + detail hero)
└── csAssets/<study>/             #   Per-point card illustrations, 1086×900 WebP (Figma PNG export, converted)
                                  #   (whatIDid-assetN.webp / impact-assetN.webp)
next.config.ts                    # PostHog reverse-proxy rewrites (/ingest/* -> PostHog US Cloud)
```

**Mental model:** `app/` = pages & routing · `components/` = reusable building blocks · `lib/` = content/data · `learn/` = write-ups.

## Notable implementation details

- **Content-driven** — page copy and case studies live in `src/lib/content.ts` and `src/lib/case-studies/` as typed data; components render from it, so adding a case study or link is a data edit, not a layout edit.
- **URL-addressable case-study modal** — clicking a "Selected work" card opens the study as an overlay with its own shareable URL (`/work/<slug>`), built with Next.js parallel + intercepting routes. Full walkthrough in [`learn/case-study-modal.md`](learn/case-study-modal.md), refresh/back-button behavior in [`learn/case-study-refresh-behavior.md`](learn/case-study-refresh-behavior.md).
- **Case-study point cards** — "What I did" and "Impact" points can render as illustrated cards instead of plain text, opt-in per section.
- **Design tokens** — colours and fonts are defined once in `globals.css` (`@theme`) and referenced everywhere.
- **Custom dashed hairlines** — the design's exact dash rhythm isn't achievable with `border-dashed`, so it's painted with a small gradient-based utility system. Walkthrough in [`learn/dashed-borders.md`](learn/dashed-borders.md).
- **Spring hover interactions** — case-study cards and sidebar links animate with a spring easing sampled from Figma. Walkthrough in [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md).
- **Theme-aware favicons** — the browser tab icon switches with the OS/browser colour scheme.
- **Optimized thumbnails** — one WebP export per case study, sized to serve both the home card and the detail hero. Full story, including a Vercel request-quota incident this solved, in [`learn/vercel-isr-quota.md`](learn/vercel-isr-quota.md).
- **Social-share ready** — Open Graph/Twitter metadata, a designed static share card for the home page, and generated per-study share cards.
- **Machine-readable for AI** — schema.org JSON-LD and a `/llms.txt` brief make the site legible to AI tools, not just search engines. Full write-up in [`learn/machine-readable-portfolio.md`](learn/machine-readable-portfolio.md).
- **Accessibility hardened** — real focus trap on the case-study dialog, correct heading outline, keyboard-safe backdrop close, clean back-button history, branded 404.
- **Fully responsive, three tiers** — see [Responsive design](#responsive-design) below.
- **Analytics run production-only** — Clarity and PostHog no-op under `pnpm dev`, so local testing never pollutes real visitor data.

## Responsive design

Built and verified as three separate phases against Figma references at each width — the design changes mechanism, not just size, at each tier.

| Width | What changes |
|---|---|
| **≥900px** | True desktop: fixed sidebar alongside a centered content column |
| **600–900px** | Sidebar becomes an always-expanded bottom pill; content goes full-bleed |
| **<600px** | Pill collapses to identity + an expandable chevron; case-study cards and the detail view switch to auto-height layouts |

## Status

**Live at [arshkaushik.com](https://arshkaushik.com)** — deployed on Vercel (DNS via Cloudflare), fully responsive across all three breakpoint tiers, with Clarity + PostHog analytics running in production.

## Learn docs

The [`learn/`](learn/) folder documents the trickier pieces line-by-line — the reasoning behind the code and, where relevant, the debugging story:

- [`learn/dashed-borders.md`](learn/dashed-borders.md) — the dashed-hairline system and the bug behind it.
- [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md) — the spring-based hover reveal.
- [`learn/case-study-modal.md`](learn/case-study-modal.md) — the URL-addressable case-study overlay.
- [`learn/focus-visible-outline.md`](learn/focus-visible-outline.md) — a focus-ring bug and its fix.
- [`learn/machine-readable-portfolio.md`](learn/machine-readable-portfolio.md) — making the site legible to AI tools.
- [`learn/vercel-isr-quota.md`](learn/vercel-isr-quota.md) — how a low-traffic portfolio burned 75% of a request quota, and the fix.
- [`learn/svg-thumbnail-blur.md`](learn/svg-thumbnail-blur.md) — *(superseded)* the thumbnail-blur investigation that preceded the current approach.
- [`learn/inline-svg-thumbnails-explained.md`](learn/inline-svg-thumbnails-explained.md) — *(superseded)* a walkthrough of the earlier inline-SVG thumbnail implementation.
- [`learn/case-study-refresh-behavior.md`](learn/case-study-refresh-behavior.md) — the case-study refresh/back-button bug and its fix.
