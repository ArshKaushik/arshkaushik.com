# 04 — Fix Log for the Code Review Findings

**Scope:** every finding from `fable5-check/01-code-review.md`, fixed on branch `v1.1-fable5-exp` on 2026-07-15 — except two explicitly deferred by Arsh (see [Deferred](#deferred-by-decision)). Every number below is a real measurement from a command run against this working tree; nothing is estimated.

## Results at a glance

| Metric | Before | After | Change |
|---|---|---|---|
| Home page HTML (raw) | 11,209,735 B | **35,880 B** | **−99.7%** (313× smaller) |
| Home page HTML (gzip) | 3,710,633 B | **5,710 B** | **−99.8%** (650× smaller) |
| Heaviest case-study HTML (gzip) | 5,964,444 B | **8,657 B** | −99.9% |
| Thumbnail asset per study | 0.98–3.4 MB inline SVG ×2 per page | 64–94 KB WebP, cached separately | pages no longer carry image bytes at all |
| Client JS (all chunks, gzip) | 266,258 B | 284,889 B | +18.6 KB (next/image runtime) |
| `pnpm build` / `pnpm lint` / `tsc --noEmit` | ✅ / ✅ / ✅ | ✅ (12/12 pages) / ✅ exit 0 / ✅ exit 0 | still clean |

| # | Finding | Status |
|---|---|---|
| 1 | 11–18 MB pages from inlined SVGs | ✅ Fixed (SVGO + 2× WebP via next/image) |
| 2 | Dead click on card → modal | ✅ Fixed (payload −99.9% + pressed state) |
| 3 | No OG/Twitter metadata, sitemap, robots | ✅ Fixed (incl. generated og:images) |
| 4 | Modal without focus containment | ✅ Fixed (`inert` background) |
| 5 | Backdrop-close on scrollbar/text-selection | ✅ Fixed (press-origin tracking) |
| 6 | Invisible focusable nav links | ✅ Fixed (`inert` when collapsed) |
| 7 | No headings on home page | ✅ Fixed (h1/h2/h3) |
| 8 | Analytics weight / dual replay | ⏸ Deferred by decision |
| 9 | Scroll-lock layout jump | ✅ Fixed (scrollbar-width padding) |
| 10 | Back button reopens closed study | ✅ Fixed (`router.replace`) |
| 11 | Dead `deck` field | ⏸ Deferred by decision |
| 12 | Misc (prop type, 404, double-rAF, comments) | ✅ Fixed |

---

## Finding 1 — Page weight (Critical, P0)

**Fix applied (two stages, per the agreed plan):**

**Stage 1 — SVGO** on `public/thumbnails/*.svg` (multipass, `floatPrecision: 2`), with two deliberate guards:
- `viewBox` kept on the root tag (newer SVGO preserves it by default — the build confirmed the root tags survived intact).
- `cleanupIds: { minify: false }` — all three SVGs used to inline into the *same* page, and SVGO's minified ids (`a`, `b`, `c`…) would have collided across files, cross-wiring filters/clipPaths. Verified after: zero duplicate ids across the three files.

Measured results:
```
commandLine.svg      983,579 → 299,234 B (gzip 58,722)   −69.6%
connectorConfig.svg  3,440,583 → 776,540 B (gzip 153,349) −77.4%
designSystem.svg     1,149,822 → 345,228 B (gzip 63,812)  −70.0%
Home HTML after SVGO alone: 2,896,496 raw / 560,893 gzip — still over the ~200KB target
```

**Stage 2 — 2× WebP rasters via `next/image`** (triggered because SVGO alone missed the target; all three converted together to keep one code path). Rendered with `sharp` (installed in the session scratchpad, **not** added to the repo) at density-scaled 1472px width — 2× the largest display size (736px in `CaseStudyDetail`) — so nothing is ever upscaled:
```
commandLine.webp      1472×789   77,012 B
connectorConfig.webp  1472×789   63,710 B
designSystem.webp     1472×789   93,544 B
```
Code changes:
- `CaseStudyCard.tsx` — `next/image` `fill` + `object-cover object-left` (preserves the old `xMinYMid slice` left-anchored crop), `sizes="(max-width: 600px) calc(100vw - 80px), 552px"`, `priority` on the first card (the home page's likely LCP element).
- `CaseStudyDetail.tsx` — `next/image` `fill` + `object-cover` (center crop, preserving `xMidYMid slice`), `priority` (it's the LCP element on a hard-loaded `/work/[slug]`), and it now reads `study.thumbnailCover` directly — the `thumbnailSvg` prop threading is gone.
- `CaseStudies.tsx`, `work/[slug]/page.tsx`, `@modal/(.)work/[slug]/page.tsx` — no more `getInlineSvg` calls.
- `src/lib/case-studies/*.ts` — `thumbnailCover` now points at `.webp`.
- `src/lib/inline-svg.ts` — **deleted** (zero remaining importers, verified by grep). The `fs` → client-boundary concern it existed to manage is gone with it: `grep` for `fs` imports across `src/` now returns nothing.
- README updated to describe the new pipeline; the optimized `.svg` files stay in `public/thumbnails/` as the vector source of truth (unreferenced by the app).

**Why this approach:** the megabytes lived in Figma's text-outlined path data, which no inline strategy could fix; a properly-sized 2× raster sidesteps both the weight and the original WebKit `<img>`-SVG blur bug (which was specific to browser-rasterized SVG, not to real raster sources — see `learn/svg-thumbnail-blur.md` for the history).

**Verification:** build output above; final page sizes:
```
index.html                 35,880 raw /  5,710 gzip   (was 11,209,735 / 3,710,633)
work/connector-config.html 53,910 raw /  8,657 gzip   (was 18,124,274 / 5,964,444)
work/command-line.html     52,391 raw /  8,342 gzip
work/design-system.html    51,058 raw /  8,057 gzip
```
Renders of all three WebPs were visually inspected during conversion (text legible, drop shadows intact, no filter corruption) — but see [Needs Arsh's visual QA](#needs-arshs-visual-qa).

## Finding 2 — Dead click on card → modal (High, P0)

**Fix applied:** the root cause was the payload: the intercepted route's on-demand response carried megabytes of inline SVG read synchronously from disk per request. That entire pipeline is gone (finding 1) — the modal's RSC payload is now just the study's text content (the pages that used to be 6.5–9 MB of RSC are now ~50 KB of HTML total). On top of that, `CaseStudyCard.tsx` got `transition-opacity active:opacity-70` — an instant pressed acknowledgment on the click itself.
**Why no `loading.tsx`:** with the payload at ~1/1000th of its old size, the server round-trip is a perceptual non-event; a loading state would flash distractingly for a few milliseconds.
**The planned `getInlineSvg` memoization** became moot — the function was deleted outright (finding 1), which is strictly better than caching it.
**Verification:** build shows `ƒ /(.)work/[slug]` unchanged as a route; the dynamic response now contains no image bytes (thumbnails load as separately-cached static `/_next/image` requests).

## Finding 3 — Social-share metadata (High, P0)

**Fix applied:**
- `layout.tsx`: `metadataBase: new URL("https://arshkaushik.com")` plus `openGraph` (type/siteName/url/title/description) and `twitter` (`summary_large_image`) blocks.
- `work/[slug]/page.tsx` `generateMetadata`: per-study `openGraph` (type `article`, per-slug URL) + `twitter`.
- **Generated og:images** via the `opengraph-image.tsx` file convention (`next/og`/`ImageResponse`): a root card (name · role, the hero tagline in Instrument Serif, arshkaushik.com) and a per-study variant (study title + summary), both on the site's own tokens — page-grey background, white surface card, dashed `#d8d8d8` stroke. Fonts are fetched from Google Fonts **at build time** by the new `src/lib/og-fonts.ts` (satori can't read next/font's woff2 files); everything is try/caught so an offline build falls back to satori's default font instead of failing.
- New `src/app/sitemap.ts` (home + three studies, sourced from the same `caseStudies` module the pages render from) and `src/app/robots.ts` (allow all, sitemap pointer).

**Verification:** build output lists `○ /opengraph-image`, `○ /robots.txt`, `○ /sitemap.xml`, and `● /work/-/opengraph-image` with all three study slugs prerendered. Generated sitemap.xml and robots.txt bodies read back correct. Both og:image PNGs were rendered and visually inspected — Instrument Serif loaded, dashed border and tokens correct (root image: 51,733 B).

## Finding 4 — Modal focus containment (High, P1)

**Fix applied:** `CaseStudyOverlay.tsx` — a mount effect walks **up** from the dialog to `<body>`, setting `inert` on every sibling at each level and restoring (only what it flipped) on unmount. `aria-modal` *claimed* the background was off-limits; `inert` now enforces it — background is unfocusable and hidden from the accessibility tree, which is a real focus trap (Tab can no longer leave the dialog for the dimmed home page).
**Why the ancestor walk instead of "inert all body children":** the dialog's DOM position differs by caller — a direct body child via the `@modal` slot on soft nav, but *nested inside the layout column* on a hard-loaded `/work/[slug]`. Inerting body children would have missed the nested case entirely (the dialog's own ancestor would have been spared, and `HomeContent` sits inside it). The walk covers exactly "everything except my ancestors" in both shapes.
**Verification:** `tsc --noEmit` clean (the `inert` DOM property is typed in the current lib); logic traced against both mount shapes.

## Finding 5 — Backdrop-close misfires (Medium, P1)

**Fix applied:** `CaseStudyOverlay.tsx` — `onPointerDown` on the dialog records whether the *press* qualified as a backdrop press: not inside the card (checked via a new `cardRef` on the card wrapper) and not on the dialog's own scrollbar strip (`offsetX >= clientWidth`). `onClick` only closes when that flag is set. This kills both failure modes: text-selection drags that start in the card and release on the backdrop (click fires on the common ancestor — previously slammed the overlay shut mid-read), and scrollbar interactions on classic-scrollbar platforms.
**Verification:** the existing behaviors are preserved by construction — clicks fully on the backdrop (press+release outside the card) still close, clicks inside the card still don't (the card wrapper's `stopPropagation` remains as a second guard).

## Finding 6 — Invisible focusable nav links (Medium, P1)

**Fix applied:** `MobileNavPill.tsx` — `inert={!expanded}` on the collapsible panel (React 19 supports `inert` as a boolean prop). Collapsed links are now out of the tab order and the accessibility tree; the existing `aria-expanded`/`aria-controls` wiring is unchanged.
**Verification:** build + tsc clean; the panel div still animates `grid-template-rows` exactly as before (`inert` has no visual effect).

## Finding 7 — No headings on home (Medium, P1)

**Fix applied:** element swaps with classes kept, so rendering is identical (Tailwind preflight resets heading `font-size`/`font-weight` to `inherit`): `Hero.tsx` tagline `p → h1`, `CaseStudies.tsx` "Selected work" `p → h2`, `CaseStudyCard.tsx` title `p → h3`. The home page now has a real outline (h1 → h2 → h3 ×3) for screen-reader heading navigation and SEO. On `/work/[slug]` the overlay's existing `h1` coexists with the home `h1` behind it — acceptable because the background is now literally `inert` (finding 4) and thus out of the accessibility tree while the dialog is open.
**Verification:** build + lint clean; classes byte-identical to the old `p` elements (plus an explicit `font-normal` on h1 where inherit-ambiguity was worth pinning).

## Finding 9 — Scroll-lock layout jump (Low, P2)

**Fix applied:** `CaseStudyOverlay.tsx` scroll-lock effect now measures the scrollbar (`window.innerWidth − documentElement.clientWidth`) and pads `body` by exactly that width while locked, restoring both styles on unmount. In-flow content (the column, the ≥900px sticky sidebar) no longer shifts when the modal opens on classic-scrollbar platforms; macOS overlay scrollbars measure 0 and are untouched.

## Finding 10 — Back button reopens a closed study (Low, P2)

**Fix applied:** `CaseStudyOverlay.tsx` `close()` uses `router.replace(closeHref)` instead of `router.push`. Closing a hard-loaded case study no longer appends a history entry, so Back from home no longer returns to the study the user just dismissed (their original `/work/[slug]` entry remains in history from however they arrived). The intercepted-route path (`router.back()`) is unchanged.

## Finding 12 — Misc cleanups (Low, P2)

- **`string | false` prop type** — gone entirely: the `thumbnailSvg` prop no longer exists on any component (finding 1's refactor removed the threading; `CaseStudyCard` takes a plain `thumbnailSrc?: string`).
- **`suppressHydrationWarning`** — kept, now documented in `layout.tsx` with why (extension-injected body attributes) and its actual scope (this element only — children still surface real hydration bugs).
- **Branded 404** — new `src/app/not-found.tsx`: dashed white surface card, serif "404", one line of copy, "Back home" link — all existing tokens/utilities. `/work/unknown-slug` and any bad URL now land on-brand instead of the default unstyled Next page (`_not-found` still builds as a static route).
- **Enter-animation race** — `CaseStudyOverlay.tsx` now uses a nested double-`requestAnimationFrame` before flipping `open`, guaranteeing at least one painted closed-state frame so the slide-up transition always has something to animate from.
- **ESLint config comment** — reworded to say what the block actually does (re-declares the defaults that declaring any `globalIgnores` replaces).

---

## Deferred by decision

- **Finding 8 — Analytics (PostHog 53% of JS, dual session replay, no consent UI):** Arsh chose to leave analytics untouched for now; the PostHog-vs-Clarity comparison is still running. Revisit when picking the long-term vendor — the lazy-init option (dynamic-import PostHog on idle) remains the no-decision-needed 142 KB win.
- **Finding 11 — dead `deck` field:** left as-is by choice. It remains authored in all three studies and unrendered; the standing options are render-on-detail (the documented intent in `types.ts`) or delete.

## Needs Arsh's visual QA

1. **Thumbnail fidelity on a real iPhone** — the switch from inline SVG to 2× WebP re-enters the territory of the old WebKit blur bug. The rasters were inspected during conversion (crisp text, intact shadows) and are 2× the largest display size, but only real-device eyes settle it. Check both the home cards and the detail-page hero image, and zoom.
2. **Raster rendering fidelity in general** — the SVGs were rasterized by librsvg (via sharp), not a browser; its filter rendering (drop shadows) looked correct in inspection but deserves a side-by-side glance against the live SVG originals (still in `public/thumbnails/*.svg`).
3. **og:image previews in the wild** — paste `arshkaushik.com` and a `/work/...` URL into LinkedIn/Slack/iMessage after the next deploy and confirm the cards unfurl (crawlers need the production deploy, not localhost).
4. **Pressed state feel** — `active:opacity-70` on the cards: confirm the dip reads as acknowledgment, not flicker, now that the modal opens near-instantly.
5. **404 page** — load `/work/nope` and judge the branded 404's composition at desktop and mobile widths.

## Full verification transcript (2026-07-15)

```
pnpm build        ✅ Compiled successfully; 12/12 static pages
                  Routes: ○ / · ○ /_not-found · ƒ /(.)work/[slug] · ○ /opengraph-image
                  ○ /robots.txt · ○ /sitemap.xml · ● /work/[slug] ×3 · ● /work/-/opengraph-image ×3
pnpm lint         ✅ exit 0, no output
npx tsc --noEmit  ✅ exit 0, no output
fs in src/        ✅ grep: no matches (inline-svg.ts deleted)
graphify update . ✅ rebuilt: 321 nodes, 375 edges, 22 communities
git               ⛔ intentionally untouched — no commits, no staging (not requested)
```
