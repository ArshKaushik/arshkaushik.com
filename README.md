# arshkaushik.com — branch `v1.1-fable5-exp`

> **This README is a record of what was done on this branch**, not the general
> project overview. `v1.1-fable5-exp` is a sandbox branched off `main` to run a
> rigorous, model-driven review of the portfolio (using Claude Fable 5) and then
> fix the findings. The full project overview lives on `main`'s README; this file
> exists so future-me can see exactly what happened here.

**Base:** branched off `main` (last shared commit: `f148ddc`).
**State:** all work below is committed on this branch. **Not merged to `main`, not
deployed** — the live site keeps `main`'s behavior until this is merged/pushed to prod.
**Site itself is unchanged in kind** — same Next.js 16 / React / Tailwind v4 / TS
portfolio; this branch is a quality/perf/a11y pass plus the review paper trail.

---

## What this branch is

Two things: (1) a **review** of the site across three lenses, and (2) the **fixes**
for what the review found. Everything the review produced and every fix is written
up under [`fable5-check/`](fable5-check/) (see the index below).

### The review (3 lenses + a follow-up)

| Doc | Lens | Headline verdict |
|---|---|---|
| `01-1-code-review.md` | Engineering / performance / code quality | **Architecturally clean, catastrophically heavy** — home page was 11.2 MB of HTML because the Figma-export SVG thumbnails (text outlined into thousands of paths, up to 3.4 MB each) were inlined twice per page. |
| `02-1-ux-motion-design-review.md` | Motion / interaction / UI craft | **A real motion system, undermined by mechanics** — coherent spring easing and reduced-motion coverage, but a dead click before the overlay, a font-size hover that reflowed layout, hover-only reveals with no keyboard path, no visible modal close. |
| `03-candidate-assessment.md` | Senior-PD candidacy, 2026 market | **Emerging senior** — 🟢 at bar for early-stage/founding, 🟡 approaching for scale-up/big-tech ladders; AI/tooling fluency 🔵 above bar. Gates are legibility/consistency, not the work. |
| `04-post-fixed-assessment.md` | Lighthouse / speed (after fixes) | **Fast, passes Lighthouse** — Perf 92/94/100, A11y 100, SEO 100, CLS 0. Best Practices 73, entirely the analytics stack (Microsoft Clarity's third-party cookies). |

Framing that shaped the review: **intentional compression** — case studies are
deliberately kept to high-signal key points, so depth gaps are treated as
*interview-readiness* items, never portfolio flaws.

---

## What was fixed on this branch

### 1. Page weight (the P0) — 11.2 MB → ~36 KB HTML

- Ran **SVGO** on the three `public/thumbnails/*.svg` exports (cut them 70–77%), but
  the biggest was still 776 KB, so all three were rasterized to **2× WebP**
  (`public/thumbnails/*.webp`, 64–94 KB each) and served through **`next/image`**.
- Deleted `src/lib/inline-svg.ts` (the old inline-SVG pipeline) — with it went the
  last `fs` import in `src/`. `CaseStudyCard`, `CaseStudyDetail`, `CaseStudies`, and
  both `work/[slug]` route files now pass a `/thumbnails/*.webp` path instead of
  pre-rendered SVG markup. `thumbnailCover` in the three `case-studies/*.ts` now `.webp`.
- **Result:** home page **11.2 MB → 35.9 KB HTML (5.7 KB gzipped, ~650× smaller)**;
  heaviest case-study page 18.1 MB → ~52 KB. Optimized source SVGs are kept in
  `public/thumbnails/` as the design source of truth.
- Note: this re-enters the old WebKit `<img>`-SVG blur territory (see
  `learn/svg-thumbnail-blur.md`) — 2× resolution should be crisp, **but needs a real
  iPhone check** (logged in `01-2-code-review-fix.md`).

### 2. Social-share metadata + SEO

- `layout.tsx`: `metadataBase`, Open Graph + Twitter (`summary_large_image`) tags.
- `work/[slug]/page.tsx` `generateMetadata`: per-study OG/Twitter.
- New **build-time `next/og` images**: `src/app/opengraph-image.tsx` (root) and
  `src/app/work/[slug]/opengraph-image.tsx` (per-study), on-brand dashed cards in
  Instrument Serif via `src/lib/og-fonts.ts` (build-time font fetch, try/caught).
- New `src/app/sitemap.ts` and `src/app/robots.ts`.

### 3. Accessibility

- **Focus containment:** `CaseStudyOverlay` walks up from the dialog and sets `inert`
  on every sibling at each level — real focus trapping that works for both the
  soft-nav (`@modal`) and hard-load DOM shapes.
- **Backdrop close** only fires when the *press started* on the backdrop (not a
  text-selection drag ending outside the card, not a scrollbar interaction).
- Collapsed `MobileNavPill` links get `inert` — no longer four invisible tab stops.
- **Heading outline:** Hero `p`→`h1`, "Selected work" `p`→`h2`, card title `p`→`h3`
  (Tailwind preflight resets heading styles, so they render identically).
- **Keyboard parity:** `group-focus-visible` variants mirror the card hover reveal.
- **Skip link** in `layout.tsx` (first focusable element) → `#content` on `HomeContent`'s `<main>`.

### 4. Motion polish

- **NavLink hover** no longer animates `font-size` (layout reflow every frame, which
  shuffled neighbors in the bottom pill). Now `scale-[1.1667]` (= 14/12, visually
  identical) with `origin-left`, on the compositor. Tailwind v4 trap: `scale-*`
  compiles to the standalone `scale` property, so the transition is `transition-[color,scale]`.
  `BackNav` inherits via the shared `navLinkClassName`.
- **One duration everywhere:** unified `511ms` and the backdrop's `400ms` → single
  **`520ms`** token on the one `--ease-spring-gentle` curve.
- Inline case-study links joined the motion system (spring + `motion-reduce`).
- Double-`requestAnimationFrame` on the overlay enter (guarantees a painted closed frame first).

### 5. Reading comfort + copy

- `leading-relaxed` (1.625) on the case-study long-form copy — **deliberately not** on
  the home-card description, whose 600–900px layout math needs exactly 2×21px lines.
- Hero stat label **"Ships in" → "Builds with"** (`content.ts`) — "ships in" garden-paths
  as a duration before it reads as a toolchain.

### 6. Misc / P2

- Scroll-lock now pads the body by the scrollbar width (no sideways jump on
  classic-scrollbar platforms).
- Overlay close uses `router.replace` (Back button doesn't return to the just-closed study).
- Branded 404 (`src/app/not-found.tsx`).
- Documented `suppressHydrationWarning`; fixed the misleading `eslint.config.mjs` comment.

### 7. Analytics (Lighthouse follow-up)

- `disable_surveys: true` in `instrumentation-client.ts` — PostHog was fetching a
  ~32 KB `surveys.js` (82% unused) on every visit. Unused JS **115 → 90 KiB**; replay
  comparison unaffected.

---

## Deferred / intentionally left alone

- **Analytics stack** (Clarity + PostHog side-by-side) — kept running by decision. The
  ~25 Best-Practices-point cost of Clarity's third-party cookies is documented, not fixed.
- **`deck` field** on case studies — authored but unrendered; left as-is by decision.
- **Visible design/copy** — the desktop modal **close button** and an **end-of-study
  footer** were proposed and **skipped**: Arsh designs those himself. Documented with the
  one-line change each would take if wanted later.

---

## `fable5-check/` — the paper trail

The review + fix docs use an `NN-1` (findings) / `NN-2` (fix log) naming convention:

- [`00-PROMPT.md`](fable5-check/00-PROMPT.md) — the review brief.
- [`01-1-code-review.md`](fable5-check/01-1-code-review.md) / [`01-2-code-review-fix.md`](fable5-check/01-2-code-review-fix.md) — engineering findings + fix log.
- [`02-1-ux-motion-design-review.md`](fable5-check/02-1-ux-motion-design-review.md) / [`02-2-ux-motion-design-review-fix.md`](fable5-check/02-2-ux-motion-design-review-fix.md) — UX/motion findings + fix log.
- [`03-candidate-assessment.md`](fable5-check/03-candidate-assessment.md) — senior-PD candidacy assessment (personal).
- [`04-post-fixed-assessment.md`](fable5-check/04-post-fixed-assessment.md) — Lighthouse audit after the fixes.

`arsh-kaushik-resume.pdf` and `linkedin-profile.pdf` were the source artifacts the
candidate assessment was read against.

---

## Verification (this branch)

`pnpm build` ✅ (12/12 static pages) · `pnpm lint` ✅ · `npx tsc --noEmit` ✅.
Lighthouse (headless Chrome, production build): Perf 92 (mobile) / 100 (desktop),
A11y 100, SEO 100, Best Practices 73, CLS 0, mobile FCP 0.8 s.

**Open item:** iPhone crispness check on the new 2× WebP thumbnails (WebKit blur history).
