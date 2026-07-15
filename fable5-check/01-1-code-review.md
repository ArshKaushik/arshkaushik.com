# 01 — Engineering & Performance Review

**Reviewed:** branch `v1.1-fable5-exp` (identical to `main` — `git diff main --stat` returned no source changes). Next.js 16.2.9 / React 19.2.4 / Tailwind v4 / TypeScript 5, pnpm 11.2.2.
**Method:** every file in `src/` read in full; `pnpm build`, `pnpm lint`, `npx tsc --noEmit` executed; built output in `.next/` measured directly; no source files modified.

---

## Executive Summary

**Verdict: Architecturally clean, catastrophically heavy.** The routing architecture (parallel + intercepting routes with a standalone fallback) is correctly implemented, the build/lint/typecheck are all green with zero warnings, and the three recently-fixed bug areas are verifiably sound. But one decision — inlining multi-megabyte Figma-export SVGs as raw markup — makes the home page **11.2 MB of HTML (3.7 MB gzipped)** and the heaviest case-study page **18.1 MB (6.0 MB gzipped)**. That is roughly 20–40× a normal performance budget and dominates every other finding in this file. Fix that one thing and this is a genuinely well-built small site.

### Build health (actual results)

| Command | Result |
|---|---|
| `pnpm build` | ✅ Compiled successfully in 1030ms; TypeScript pass in 880ms; 6/6 static pages generated. Routes: `/` static, `/work/[slug]` SSG ×3, `/(.)work/[slug]` **dynamic (ƒ)**, `/_not-found` static |
| `pnpm lint` | ✅ Exit 0, zero warnings/errors |
| `npx tsc --noEmit` | ✅ Exit 0, zero errors |

### Prioritized findings

| # | Finding | Severity | Priority |
|---|---|---|---|
| 1 | 11.2–18.1 MB HTML pages from SVGs inlined twice (HTML + RSC payload) | **Critical** | P0 |
| 2 | Modal route is server-rendered per click: multi-MB fetch, sync `readFileSync`, no loading state | **High** | P0 |
| 3 | Zero Open Graph / Twitter metadata, no `metadataBase`, no sitemap/robots | **High** | P0 |
| 4 | Modal has no focus trap; background content not inert | **High** | P1 |
| 5 | Backdrop-close bound to the scroll container (scrollbar drag / text-selection closes modal) | Medium | P1 |
| 6 | Collapsed mobile-nav links remain keyboard-focusable while invisible | Medium | P1 |
| 7 | Home page contains no headings at all (`h1`–`h6`) | Medium | P1 |
| 8 | Three analytics vendors; PostHog alone is 53% of all shipped JS; dual session replay; no consent UI | Medium | P2 |
| 9 | Scroll lock ignores scrollbar width → layout shift on modal open (visible-scrollbar platforms) | Low | P2 |
| 10 | Close-on-standalone pushes history; Back reopens the overlay | Low | P2 |
| 11 | Dead `deck` field authored in all three case studies, never rendered | Low | P2 |
| 12 | Misc: `string \| false` prop type, `suppressHydrationWarning` on body, no custom 404/error page, single-rAF enter animation | Low | P2 |

---

## Critical

### 1. Page weight: SVG thumbnails are inlined twice, producing 11–18 MB pages

**Claim:** Every page ships multi-megabyte HTML because the three case-study thumbnails are raw Figma exports embedded as inline markup — once in the rendered HTML and again in the serialized RSC flight payload.

**Evidence (measured, not estimated):**
```
public/thumbnails/commandLine.svg      983,579 B  (gzip 335,567)
public/thumbnails/connectorConfig.svg  3,440,583 B (gzip 1,123,826)
public/thumbnails/designSystem.svg     1,149,822 B (gzip 390,200)

.next/server/app/index.html            11,209,735 B (gzip 3,710,633)
.next/server/app/index.rsc              5,587,538 B
.next/server/app/work/connector-config.html  18,124,274 B (gzip 5,964,444)
.next/server/app/work/command-line.html      13,199,123 B
.next/server/app/work/design-system.html     13,529,301 B
```
The home page inlines all three SVGs (~5.5 MB) via `CaseStudies.tsx:22-25` → `getInlineSvg()`, and the HTML is ~2× that because Next embeds the RSC payload (containing the same strings) alongside the rendered markup. A case-study page inlines all three (home behind) **plus** the study's own SVG a second time (`src/app/work/[slug]/page.tsx:48-49`). Inspection of the SVGs shows the cause: Figma exported **text converted to vector outlines** — thousands of `<path>` glyphs (e.g. `connectorConfig.svg` opens with per-character path data like `M24.69 123.023C…`).

**Reasoning:** 3.7 MB gzipped HTML must fully download before first render — on a 5 Mbps connection that's ~6 seconds of blank page before any paint; on mobile LTE, worse. LCP will be measured in multi-seconds for exactly the audience (recruiters clicking a LinkedIn link, often on phones) the site exists for. Parsing 11 MB of DOM (thousands of SVG nodes with filters) also costs main-thread time and memory on low-end devices. The inline-SVG decision itself was made for a real, documented reason (WebKit `<img>`-SVG blur, `src/lib/inline-svg.ts:9-17`) — the *decision* is defensible; the *asset weight* is not.

**Severity: Critical. Recommendation (P0):** Attack the assets, not the architecture:
1. Run the SVGs through SVGO with precision reduction — Figma exports typically shrink 60–90%.
2. Better: re-export with text as `<text>` (with embedded font subsetting) or rebuild the illustrations so type isn't outlined per-glyph — outlined text is where the megabytes live.
3. If the illustrations can't get under ~50–100 KB each, switch to high-DPR raster (AVIF/WebP at 2×, via `next/image` with `sizes`) — the WebKit blur issue was specific to `<img src="*.svg">` rasterization, not to a properly-sized raster source.
4. Whatever path you pick, verify the home page HTML lands under ~200 KB gzipped.

---

## High

### 2. Every card click is an on-demand server render with a multi-MB response and no loading feedback

**Claim:** The intercepted modal route is dynamic, so opening a case study performs a server round-trip that re-reads and re-transforms the SVG synchronously per request, and the UI gives zero feedback until the multi-MB RSC payload arrives.

**Evidence:** Build output line `ƒ /(.)work/[slug] — server-rendered on demand` (no `generateStaticParams` in `src/app/@modal/(.)work/[slug]/page.tsx`, unlike the standalone page). That route calls `getInlineSvg()` (`page.tsx:23-24`), which does `readFileSync` on files up to 3.4 MB (`src/lib/inline-svg.ts:24-25`) with no memoization — every open of the connector-config modal re-reads 3.4 MB from disk and re-runs the regex. There is no `loading.tsx` anywhere in `src/app/` (verified by full file listing), and `CaseStudyCard.tsx` has no pressed/active state, so between click and modal mount the page is visually inert.

**Reasoning:** On Vercel this is a function invocation per card click (cost + cold-start latency), plus ~1.1 MB gzipped of RSC transfer for the heaviest study, plus disk I/O — all serialized before the entrance animation can even start. The overlay's slide-up choreography is polished, but users on median connections will experience a 1–3 s dead click *before* it plays. This compounds finding #1 and is the single biggest gap between how the site is engineered and how it will *feel*.

**Severity: High. Recommendation (P0 jointly with #1):** Shrinking the SVGs solves 90% of this. Additionally: memoize `getInlineSvg` at module level (a `Map<string,string>` — the inputs are three static files); the modal content is identical to the prerendered standalone page, so cached reads are pure win. Consider an instant visual acknowledgment on click (active state or optimistic overlay skeleton).

### 3. No social-share metadata at all

**Claim:** The site defines title/description/favicons but no Open Graph or Twitter Card tags, no `metadataBase`, no OG image, no sitemap, no robots.

**Evidence:** `src/app/layout.tsx:20-41` — `metadata` contains only `title`, `description`, `icons`. `generateMetadata` in `src/app/work/[slug]/page.tsx:24-36` returns only `title` + `description`. `public/` contains only favicons and thumbnails (full listing); no `opengraph-image.*`, `sitemap.ts`, or `robots.ts` exists in `src/app/`.

**Reasoning:** This portfolio's primary distribution channel is pasted links — LinkedIn DMs, job applications, recruiter Slack. Without OG tags, every share renders as a bare URL with no preview card. For a designer, an unfurled link with no image is a missed first impression at the exact moment of highest leverage. This is disproportionately cheap to fix relative to its impact on the site's actual job (see report 03).

**Severity: High (in context — technically the site functions). Recommendation (P0):** Add `metadataBase`, `openGraph` + `twitter` blocks in `layout.tsx`, a designed 1200×630 OG image (per-study images via `opengraph-image` file convention for `/work/[slug]`), plus `sitemap.ts` and `robots.ts` (both ~10 lines).

### 4. Dialog semantics without dialog behavior: no focus trap, background not inert

**Claim:** The overlay declares `role="dialog" aria-modal="true"` but lets Tab walk out of the dialog into the dimmed home page behind it.

**Evidence:** `CaseStudyOverlay.tsx:116-125` — the component moves initial focus into the dialog (`:68-70`, a nice touch with a well-reasoned comment) and handles Esc (`:107-113`), but contains no focus containment and never sets `inert`/`aria-hidden` on the background tree. The home content remains fully mounted behind it (`work/[slug]/page.tsx:52-53` and the intercepted case by design).

**Reasoning:** `aria-modal="true"` tells assistive tech "everything else is inert" — but the DOM doesn't enforce it. A keyboard user Tabbing past the last link in the case study lands on invisible home-page cards behind the overlay; a screen-reader user can wander into content the visual design says is inaccessible. This fails WCAG 2.4.3 (Focus Order) in spirit and is the kind of thing design-systems-literate interviewers notice in a portfolio's own code.

**Severity: High. Recommendation (P1):** Either (a) apply `inert` to the sibling content while the overlay is mounted (React 19 supports the `inert` prop), or (b) use the native `<dialog>` element with `showModal()`, which provides focus trapping, Esc, and top-layer semantics for free — and would let you delete most of the hand-rolled close logic.

---

## Medium

### 5. Backdrop-close fires from scrollbar drags and text selections

**Claim:** `onClick={close}` sits on the dialog root, which is also the scroll container, so interactions that end on it — dragging its scrollbar (Windows/Linux visible scrollbars), or selecting case-study text and releasing outside the card — close the modal unintentionally.

**Evidence:** `CaseStudyOverlay.tsx:122` (`onClick={close}` on the `overflow-y-auto` root, `:123`); `stopPropagation` lives on the card wrapper (`:155`). DOM `click` fires on the nearest common ancestor of mousedown/mouseup targets, so mousedown-in-card + mouseup-on-backdrop → click on the root → `close()`.

**Reasoning:** Recruiters copy-paste from portfolios (into notes, into Slack). A text selection that overshoots the card boundary slams the modal shut mid-read. macOS overlay scrollbars mask the scrollbar case, which is probably why it hasn't been felt in development.

**Severity: Medium. Recommendation (P1):** Track `mousedown` target and only close when both down and up occurred on the backdrop; or put the close handler on a dedicated backdrop element behind the scroller rather than on the scroller itself.

### 6. Invisible-but-focusable nav links in the collapsed mobile pill

**Claim:** When `MobileNavPill` is collapsed, the four nav links are visually hidden (grid `0fr` + `overflow-hidden`) but remain in the tab order.

**Evidence:** `MobileNavPill.tsx:100-125` — the collapse mechanism is `grid-rows-[0fr]` with `overflow-hidden` on `<nav>`; nothing sets `inert`, `visibility: hidden`, or `tabIndex=-1` on the hidden links. (The ARIA wiring that *is* there — `aria-expanded`, `aria-controls`, dynamic `aria-label` at `:57-59` — is genuinely good.)

**Reasoning:** A keyboard user on a narrow viewport Tabs into four links they cannot see; focus visibly vanishes for four stops. WCAG 2.4.7 / basic keyboard UX.

**Severity: Medium. Recommendation (P1):** Add `inert={!expanded}` on the panel div (one attribute; React 19 supports it), or toggle `invisible` (visibility) alongside the row animation — visibility transitions cleanly with the 520ms delay pattern.

### 7. The home page has no headings

**Claim:** There is not a single `h1`–`h6` on the home page; the only headings site-wide are inside `CaseStudyDetail`.

**Evidence:** Hero tagline is a `<p>` (`Hero.tsx:9`); "Selected work" is a `<p>` (`CaseStudies.tsx:13`); card titles are `<p>` (`CaseStudyCard.tsx:99`). `CaseStudyDetail.tsx:63` has the only `h1`, `:164` the `h2`s.

**Reasoning:** Screen-reader users navigate by headings first — on this home page that yields an empty list. For SEO, the page presents no document outline for "Arsh Kaushik product designer" queries. Since styling is fully decoupled from element choice here, this costs nothing to fix.

**Severity: Medium. Recommendation (P1):** Hero tagline → `h1`, "Selected work" → `h2`, card titles → `h3` (keep the exact classes). On `/work/[slug]`, note there would then be two `h1`s (home behind + overlay) — acceptable inside a `role="dialog"`, but worth a conscious decision.

### 8. Analytics stack: three vendors, half the JS budget, dual session replay, no consent

**Claim:** Vercel Analytics + PostHog + Clarity all ship; PostHog is bundled into the main client chunk and is over half of all JavaScript; two session-replay tools record simultaneously in production; there is no consent mechanism.

**Evidence:** `package.json` deps; measured chunk sizes: all static chunks total 266,258 B gzipped, and the 448 KB chunk containing PostHog (`grep`-verified) is 142,418 B gzipped = **53%** of total JS. `instrumentation-client.ts:1-30` statically imports `posthog-js` (the library ships to every visitor even though `init` is production-gated). The dual-replay setup is deliberate and documented ("deliberately left enabled alongside Clarity's… before deciding which one to keep", `instrumentation-client.ts:3-6`). No consent/cookie UI exists anywhere in `src/`.

**Reasoning:** The A/B-the-vendors rationale is legitimate but has a shelf life — every production visitor pays double replay instrumentation (CPU + network) meanwhile. Session recording without consent is also a GDPR/ePrivacy exposure for EU visitors; for a personal portfolio the practical risk is low, but recruiters at European companies are real traffic. Not legal advice — flagging the consideration.

**Severity: Medium. Recommendation (P2):** Pick one replay vendor (you've had since July to compare); lazy-init PostHog on first interaction or `requestIdleCallback` so 142 KB leaves the critical path; if replay stays, consider EU-region masking/consent.

---

## Low

### 9. Scroll lock causes a layout jump on visible-scrollbar platforms
`CaseStudyOverlay.tsx:79-85` sets `document.body.style.overflow = "hidden"` without compensating for scrollbar width. On Windows (classic scrollbars), opening the modal removes the ~15px scrollbar and the whole page shifts right, then back on close. macOS overlay scrollbars hide this in development. **Fix (P2):** `scrollbar-gutter: stable` on the root, or pad `body` by the measured scrollbar width while locked.

### 10. Back-button asymmetry after closing a standalone case study
`CaseStudyOverlay.tsx:100-103` — on a hard-loaded `/work/[slug]`, close does `router.push("/")`, appending history. Browser Back from home then returns to `/work/[slug]`, re-opening what the user just closed. `router.back()` isn't safe here (external referrer), but the observed loop is mildly disorienting. **Fix (P2):** `router.replace("/")` — the case-study entry is preserved in the user's history anyway via the original navigation.

### 11. Dead content field: `deck`
`types.ts:26` defines `deck`; all three studies author it (e.g. `design-system.ts:8`), and grep confirms zero renders outside `src/lib/case-studies/`. Either render it (it's good copy — arguably better than `summary` for the detail header) or delete it; carrying hand-maintained content that never displays invites drift. **(P2)**

### 12. Small code-quality items (all P2)
- **`thumbnailSvg?: string | false`** (`CaseStudyOverlay.tsx:48`, `CaseStudyDetail.tsx:57`, `CaseStudyCard.tsx:29`) — the `false` leaks from `study.thumbnailCover && getInlineSvg(…)` call sites. Normalize with `? … : undefined` and the union collapses to `string | undefined`.
- **`suppressHydrationWarning` on `<body>`** (`layout.tsx:60`) — presumably for extension-injected attributes, but it also mutes genuine hydration bugs on the element most likely to have them. Scope it or document why.
- **No custom `not-found.tsx`/`error.tsx`** — `/work/anything-else` correctly `notFound()`s (`work/[slug]/page.tsx:45`) but lands on the default unbranded Next 404. For a designer's site, the 404 is a free craft signal.
- **Single-`requestAnimationFrame` enter animation** (`CaseStudyOverlay.tsx:73-76`) — `useEffect` usually runs post-paint so this works, but React may flush passive effects before paint under load; the canonical guarantee is a double rAF or `@starting-style`. If the modal ever mounts with no slide-up, this is why. Flagged for visual QA in report 02.
- **ESLint config comment mismatch** (`eslint.config.mjs:7-8`) — the comment says "Override default ignores" but the block re-adds the same defaults. Cosmetic.

---

## Verification of the three recent bug-fix areas (requested)

1. **"No-way-back-home"** — ✅ Sound. The standalone page passes `closeHref="/"` (`work/[slug]/page.tsx:53`); `close()` branches to `router.push(closeHref)` (`CaseStudyOverlay.tsx:101`); below 900px a visible `BackNav` renders as a real `<Link href="/">` (`BackNav.tsx:38-44`). Every entry path has an exit. (Desktop's *discoverability* of that exit is a UX question — see report 02 §Interaction.)
2. **Refresh-mid-case-study parity** — ✅ Sound. Hard loads of `/work/[slug]` render `HomeContent` + the same overlay (`work/[slug]/page.tsx:50-55`); build output confirms all three slugs prerender as SSG. The overlay is visually identical in both paths since it's the same component.
3. **`fs` leaking into a client bundle** — ✅ Sound. `getInlineSvg` (which imports `node:fs`) is imported only from Server Components: `CaseStudies.tsx:2`, `work/[slug]/page.tsx:5`, `@modal/(.)work/[slug]/page.tsx:3`. The client components (`CaseStudyOverlay`, `CaseStudyDetail`, `CaseStudyCard`) receive pre-rendered strings as props. The production build compiles clean, which it wouldn't if `fs` crossed the boundary.

---

## What's genuinely good (same evidentiary bar)

- **The routing architecture is textbook.** Parallel route slot (`@modal/default.tsx` correctly returning `null`), intercepting route for soft nav, standalone SSG fallback for hard loads, `generateStaticParams` + per-slug `generateMetadata` with `params` correctly awaited as a Promise (Next 15+/16 requirement — `work/[slug]/page.tsx:27-29`). Many production Next.js apps get this pattern wrong; this one doesn't.
- **Zero-defect toolchain output.** Build, ESLint (`core-web-vitals` + TS configs), and `tsc --strict` all pass with literally empty output — verified above.
- **Security hygiene is right.** Every `target="_blank"` link carries `rel="noopener noreferrer"` (`NavLink.tsx:56`, `CaseStudyDetail.tsx:33`). `.env.local` contains only `NEXT_PUBLIC_*` values that are public by design, is covered by `.gitignore` (`.env*`), and is documented in the README. `dangerouslySetInnerHTML` is confined to self-authored files read from disk, with the trust boundary explicitly documented (`inline-svg.ts:4`).
- **Fonts are handled optimally.** Both faces via `next/font` (`layout.tsx:9-18`) — self-hosted, subset, zero render-blocking external CSS.
- **The PostHog reverse proxy is correctly built** — three rewrites in shadow-safe order with the catch-all last, plus `skipTrailingSlashRedirect` with the *reason* documented (`next.config.ts:13-32`). Both analytics inits are production-gated so dev traffic never pollutes data (`Clarity.tsx:19`, `instrumentation-client.ts:24`).
- **Content-as-data discipline.** All copy lives in `src/lib/` behind a typed schema (`types.ts`) with a barrel export; components are pure renderers. Adding a case study is a data edit. The Tailwind-scanner gotcha (runtime-concatenated classes generate no CSS) is known and designed around with an explanatory comment (`content.ts:16-21`).
- **CSS sophistication with receipts.** `@property … inherits: false` to stop custom-property leakage in the dash system (`globals.css:81-84`), `round(…, 1px)` to keep 1px hairlines on whole device pixels (`globals.css:192-199`), `overflow-clip-margin` for sub-pixel zoom rounding (`HomeContent.tsx:29-34`). Each trick exists for a stated, verifiable reason.
- **Comment density is a deliberate feature, not noise.** Nearly every non-obvious decision carries its why, often with the failed alternative documented (e.g. the `stopPropagation` placement bug history in `CaseStudyOverlay.tsx:142-149`). This is far above industry norm — by convention you'd trim it in team code, but as a learning-in-public artifact it's coherent and consistently maintained, and the README + `learn/` docs match the actual code.

---

## P0/P1/P2 recap

- **P0:** Shrink the SVG assets (finding 1) · memoize `getInlineSvg` + kill the dead-click (finding 2) · add OG/Twitter metadata + OG image + sitemap/robots (finding 3).
- **P1:** Focus trap/inert on the modal (4) · backdrop mousedown-tracking (5) · `inert` on collapsed nav (6) · semantic headings (7).
- **P2:** Consolidate analytics + lazy-init PostHog (8) · `scrollbar-gutter` (9) · `router.replace` (10) · render-or-delete `deck` (11) · the §12 cleanups.
