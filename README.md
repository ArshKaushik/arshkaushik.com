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

### Superset workspaces

`.superset/config.json` automates onboarding for [Superset](https://superset.sh)
worktrees: a new workspace runs `pnpm install` and copies `.env.local` from the
main checkout automatically, and its Run button launches `pnpm dev`.

## Project structure

```
src/
├── instrumentation-client.ts     # PostHog init (Next.js's client-instrumentation convention — no component needed)
├── app/                          # Routing (App Router) + global shell & styles
│   ├── layout.tsx                #   sidebar shell, fonts, theme favicons, @modal slot, Clarity
│   ├── page.tsx                  #   home page — re-exports HomeContent
│   ├── about/page.tsx            #   About page — PageColumn + AboutIntro + Footer, AboutPage JSON-LD
│   ├── not-found.tsx             #   branded 404 (dashed surface card, serif "404")
│   ├── opengraph-image.png       #   the designed og:image for the root URL (static, 1200x630; /about reuses it)
│   ├── robots.ts / sitemap.ts    #   crawler rules + sitemap (home, the case studies, /about)
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
│   ├── layout/                   #   Sidebar (≥900px column, Selected work / About switcher), BottomNavPill (<900px:
│   │                             #   identity + current page + native dropdown), PageColumn (the centered 600px column every page sits in)
│   ├── sections/                 #   Hero, CaseStudies, Footer, HomeContent (composes the three, reused by both routes above),
│   │                             #   AboutIntro (the About page's heading, paragraphs and signature)
│   ├── JsonLd.tsx                #   renders a JSON-LD <script>; the only <script> in the codebase
│   ├── ui/                       #   NavLink, Stat, CaseStudyCard, SurfaceCard (the white dashed box), DisplayHeading (40px serif h1)
│   ├── case-study/               #   CaseStudyDetail (shared card + point cards), CaseStudyOverlay, BackNav
│   └── effects/particleScroll/   #   Sand reveal on the case-study card: particleScroll.tsx (React wrapper),
│                                  #   snapshot.ts (card → image via modern-screenshot), engine.ts (WebGL2 sand)
└── lib/
    ├── content.ts                # Page copy (identity, nav, hero) as data
    ├── about.ts                  # About page copy — heading + paragraphs, verbatim from Figma
    ├── nav.ts                    # currentPageHref() — which page is active, shared by Sidebar + BottomNavPill
    ├── og-fonts.ts               # Build-time Google-Fonts fetch for the per-study og:images (satori cannot read next/font files)
    ├── structured-data.ts        # schema.org JSON-LD (Person / WebSite / CreativeWork), built from the content modules
    └── case-studies/             # Case-study content module — typed schema, one file per study

learn/                            # Deep-dive docs explaining non-trivial implementations
└── assets/                       #   Screenshots referenced by those docs (not served to visitors)
public/                           # Static assets — all of it referenced; nothing dead is deployed
├── thumbnails/<study>.webp       #   Case-study thumbnails, 2208×1184 (home card + detail hero)
├── csAssets/<study>/             #   Per-point card illustrations, 1086×900 WebP (Figma PNG export, converted)
│                                 #   (whatIDid-assetN.webp / impact-assetN.webp)
├── about/signature.svg           #   The About page's signature (vector, exported from Figma)
└── icons/expand-up-down-line.svg #   The bottom pill's dropdown icon (exported from Figma)
next.config.ts                    # PostHog reverse-proxy rewrites (/ingest/* -> PostHog US Cloud); dev-only
                                  #   allowedDevOrigins so a phone can load the dev server (see below)
.agents/skills/                   # Project-level AI agent skills (animation/motion and UI guidance);
.claude/skills/                   #   symlinked into .claude/ so Claude Code picks them up
CLAUDE.md                         # Instructions for Claude Code in this repo (graphify, push checklist)
```

**Mental model:** `app/` = pages & routing · `components/` = reusable building blocks · `lib/` = content/data · `learn/` = write-ups.

## Notable implementation details

- **Content-driven** — page copy and case studies live in `src/lib/content.ts`, `src/lib/about.ts` and `src/lib/case-studies/` as typed data; components render from it, so adding a case study or link is a data edit, not a layout edit.
- **About page** — `/about`, reached from the sidebar's Selected work / About switcher (the current page shows as active). It shares its building blocks with the home page (`PageColumn`, `SurfaceCard`, `DisplayHeading`, `Footer`), so the two pages can't drift apart visually. Desktop and mobile layouts both match the Figma design.
- **Bottom nav pill with a native dropdown** — below 900px the sidebar becomes one pill: your name (links home) plus the current page with an up/down icon. Tapping that opens the OS's own picker (the system menu on iOS) listing every sidebar link. It's a transparent native `<select>` over the designed label, so it's accessible by default; external links open in a new tab, with a same-tab fallback if a pop-up blocker refuses.
- **URL-addressable case-study modal** — clicking a "Selected work" card opens the study as an overlay with its own shareable URL (`/work/<slug>`), built with Next.js parallel + intercepting routes. Full walkthrough in [`learn/case-study-modal.md`](learn/case-study-modal.md), refresh/back-button behavior in [`learn/case-study-refresh-behavior.md`](learn/case-study-refresh-behavior.md).
- **Case-study point cards** — "What I did" and "Impact" points can render as illustrated cards instead of plain text, opt-in per section.
- **Design tokens** — colours and fonts are defined once in `globals.css` (`@theme`) and referenced everywhere.
- **Custom dashed hairlines** — the design's exact dash rhythm isn't achievable with `border-dashed`, so it's painted with a small gradient-based utility system. Walkthrough in [`learn/dashed-borders.md`](learn/dashed-borders.md).
- **Spring hover interactions** — case-study cards and sidebar links animate with a spring easing sampled from Figma. Walkthrough in [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md).
- **Particle sand reveal** *(experimental)* — the case-study card dissolves into sand below a line near the bottom of the screen and settles back into place as it scrolls up. The card is snapshotted to an image (`modern-screenshot`) and animated with WebGL2, so it doesn't depend on Chrome's experimental HTML-in-Canvas API. It's a decorative layer on top: the real card stays underneath for clicks, text selection and screen readers, and it switches off under reduced motion or without WebGL2.
- **Theme-aware favicons** — the browser tab icon switches with the OS/browser colour scheme.
- **Optimized thumbnails** — one WebP export per case study, sized to serve both the home card and the detail hero. Full story, including a Vercel request-quota incident this solved, in [`learn/vercel-isr-quota.md`](learn/vercel-isr-quota.md).
- **Social-share ready** — Open Graph/Twitter metadata, a designed static share card for the home page, and generated per-study share cards.
- **Machine-readable for AI** — schema.org JSON-LD (Person, WebSite, a CreativeWork per study, an AboutPage for `/about`) and a `/llms.txt` brief that includes the About text make the site legible to AI tools, not just search engines. Full write-up in [`learn/machine-readable-portfolio.md`](learn/machine-readable-portfolio.md).
- **Accessibility hardened** — real focus trap on the case-study dialog, correct heading outline, keyboard-safe backdrop close, clean back-button history, branded 404.
- **Fully responsive, three tiers** — see [Responsive design](#responsive-design) below.
- **Analytics run production-only** — Clarity and PostHog no-op under `pnpm dev`, so local testing never pollutes real visitor data.

## Responsive design

Built and verified as three separate phases against Figma references at each width — the design changes mechanism, not just size, at each tier.

| Width | What changes |
|---|---|
| **≥900px** | True desktop: fixed sidebar alongside a centered content column |
| **600–900px** | Sidebar becomes the bottom pill (identity + current page + native dropdown, max 520px wide); content goes full-bleed |
| **<600px** | Same pill at screen width minus 72px (tightening below 368px so it never overflows); case-study cards and the detail view switch to auto-height layouts |

## Status

**Live at [arshkaushik.com](https://arshkaushik.com)** — deployed on Vercel (DNS via Cloudflare), fully responsive across all three breakpoint tiers, with Clarity + PostHog analytics running in production.

The particle sand reveal on the case-study card is merged to `main`.

**In progress on `v1.4-particleScroll`:** the Selected work / About sidebar switcher, the About page (desktop + mobile) and its machine-readable layer, and the redesigned bottom nav pill. Not on `main` or the live site yet.

**Testing on a phone:** run `pnpm dev`, put the phone on the same Wi-Fi and open `http://Nimbus-3.local:3000` (the Mac's Bonjour name, allowed via `allowedDevOrigins` in `next.config.ts`).

## Learn docs

The [`learn/`](learn/) folder documents the trickier pieces line-by-line — the reasoning behind the code and, where relevant, the debugging story:

- [`learn/dashed-borders.md`](learn/dashed-borders.md) — the dashed-hairline system and the bug behind it.
- [`learn/case-study-card-hover.md`](learn/case-study-card-hover.md) — the spring-based hover reveal.
- [`learn/case-study-modal.md`](learn/case-study-modal.md) — the URL-addressable case-study overlay.
- [`learn/focus-visible-outline.md`](learn/focus-visible-outline.md) — a focus-ring bug and its fix.
- [`learn/machine-readable-portfolio.md`](learn/machine-readable-portfolio.md) — making the site legible to AI tools (Part 3 covers the About page).
- [`learn/vercel-isr-quota.md`](learn/vercel-isr-quota.md) — how a low-traffic portfolio burned 75% of a request quota, and the fix.
- [`learn/svg-thumbnail-blur.md`](learn/svg-thumbnail-blur.md) — *(superseded)* the thumbnail-blur investigation that preceded the current approach.
- [`learn/inline-svg-thumbnails-explained.md`](learn/inline-svg-thumbnails-explained.md) — *(superseded)* a walkthrough of the earlier inline-SVG thumbnail implementation.
- [`learn/case-study-refresh-behavior.md`](learn/case-study-refresh-behavior.md) — the case-study refresh/back-button bug and its fix.
