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
- Note: this re-entered the old WebKit `<img>`-SVG blur territory (see
  `learn/svg-thumbnail-blur.md`) — and the real-eyes check indeed caught blur; see 1b.

### 1b. Thumbnail blur, round two — exact-size WebPs, optimizer bypassed

Arsh's visual QA on the single-2×-WebP-via-`next/image` pipeline found the
thumbnails "a bit blurred / uncrisp". Root cause (full write-up in
`learn/svg-thumbnail-blur.md` §9): the served raster never matched the painted
device pixels — `next/image`'s optimizer resized the 1472px master to generic
breakpoints and re-encoded at quality 75, the browser then resampled *that*
again, and a `sizes` bug (`calc(100vw - 80px)` on a fixed-height, object-cover
box whose drawn width is always ~552 CSS px) made 3× phones upscale outright.

The fix removes every runtime resample:

- **`scripts/render-thumbnails.mjs`** (new, `pnpm thumbs`, `sharp` as a
  devDependency) renders each SVG master natively at every size the layout
  draws — 552/1104/1656 for the home card (1×/2×/3× of the fixed 552×296
  drawn box) and 736/1072/1472/2208 at the detail hero's 736:394 aspect —
  as **near-lossless WebP** (measured smaller *and* sharper than lossy q90
  for this flat-color art). 21 files, ~997 KB total.
- `CaseStudyCard` / `CaseStudyDetail` now render a plain **`<img srcset>`**
  over those exact files instead of `next/image` — the browser picks the
  exact file it paints (verified via Playwright WebKit + Chromium at DPR
  1/2/3, phone/iPad/desktop viewports: every combination selects the
  predicted file and paints it 1:1). The card's `sizes` is the constant
  `"552px"` its cover-crop geometry actually draws, which fixes the phone
  upscale. `fetchPriority="high"` / `loading="lazy"` keep the LCP-preload and
  lazy-load behavior `next/image` provided.
- `thumbnailCover` (a `.webp` path) became **`thumbnailBase`** (a base path;
  components append `-<width>.webp` from their own ladder).
- With its last two users gone, the **`next/image` client runtime (−18.2 KB
  gzip) dropped out** — total JS is back at the pre-raster baseline — and the
  site no longer consumes Vercel image-optimizer transformations.

### 1c. Final call: back to inline SVG — quality over page weight

Arsh reviewed the exact-size raster pipeline and still judged the thumbnails
"uncrisp / slightly blurry" against the inline-SVG era, and made the explicit
call: **visual quality wins; the page-weight cost is accepted for now** (to be
revisited later). Even a 1:1-painted raster is librsvg's antialiasing frozen at
fixed sizes — it can't match the engine's own vector paint, and it goes soft
under browser zoom or scaled-display modes where inline SVG stays perfect
(the one approach that measured crisp in *every* cell of the
`learn/svg-thumbnail-blur.md` §3 matrix).

- The inline-SVG pipeline is restored: `src/lib/inline-svg.ts` is back, called
  from `CaseStudies.tsx` / `work/[slug]/page.tsx` / the `@modal` route,
  threaded as a `thumbnailSvg` string prop into `CaseStudyCard` /
  `CaseStudyDetail` (`thumbnailBase` → `thumbnailCover`, now `.svg` paths).
  All of §1's a11y/SEO/motion fixes are untouched.
- The **SVGO'd masters** keep the damage far below the original 11.2 MB:
  home is **2.9 MB raw / 538 KB gzip**; heaviest study page 4.5 MB / 835 KB
  gzip (was 18.1 MB). `next/image` stays out of the bundle.
- The exact-size raster tooling **remains in the repo** (`pnpm thumbs`,
  `scripts/render-thumbnails.mjs`, `sharp` devDep) for whenever the weight
  problem is revisited — the generated WebPs themselves were removed from
  `public/`.
- Two learn docs carry the full story: `learn/svg-thumbnail-blur.md` (the
  three-act investigation, §1–§10) and the new
  **`learn/inline-svg-thumbnails-explained.md`** — a junior-dev-level,
  line-by-line walkthrough of the old raster code vs. the final inline-SVG
  code (server/client boundary, `dangerouslySetInnerHTML`, `preserveAspectRatio`,
  `srcset`/`sizes`, and the gotchas checklist).

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

`pnpm build` ✅ (12/12 static pages) · `pnpm lint` ✅ · `npx tsc --noEmit` ✅ —
all three re-run clean after the §1c inline-SVG restore (the full build matters:
it's the only check that catches the `fs`-in-client-bundle trap, per
`learn/svg-thumbnail-blur.md` §5). Playwright (WebKit + Chromium, DPR 1/2/3)
confirmed the restored inline SVGs render as native vector paint.
Lighthouse (headless Chrome, production build): Perf 92 (mobile) / 100 (desktop),
A11y 100, SEO 100, Best Practices 73, CLS 0, mobile FCP 0.8 s — **measured
before §1c**; the perf score should be re-run now that home HTML is back at
2.9 MB (see open item).

**Open item:** thumbnail page weight. After two raster generations (§1, §1b) Arsh
chose inline SVG for maximum crispness (§1c) — home HTML is back at 2.9 MB raw /
538 KB gzip, to be revisited later. The exact-size raster tooling (`pnpm thumbs`)
is kept in the repo for that revisit.
