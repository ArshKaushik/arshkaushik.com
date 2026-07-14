# Blurry Case-Study Thumbnails on Mobile — `next/image` and SVG, Explained

The story of a bug that only showed up on **real phones**: the case-study
thumbnails (large, illustrated SVG mockups) looked blurry in both Safari and
Chrome on mobile, but perfectly sharp on desktop — even when the desktop
window was resized down to a "mobile" width. That last detail is the whole
clue: it rules out CSS/breakpoints entirely and points at something tied to
the *device*, not the *viewport*.

The fix lives in **`src/lib/inline-svg.ts`** (new), called from each route
that renders a thumbnail (`CaseStudies.tsx`, `work/[slug]/page.tsx`,
`@modal/(.)work/[slug]/page.tsx`) and threaded down as a plain string prop
into **`CaseStudyCard.tsx`**/**`CaseStudyDetail.tsx`** — §5 explains why it's
split up this way rather than called directly inside those two components.

---

## 1. The assets

`public/thumbnails/{designSystem,connectorConfig,commandLine}.svg` are not
simple icons — they're detailed, illustrated "browser mockup" graphics
(230–358 `<path>` elements each, drop-shadow `<filter>`s, masks), 552×296
native size, 960 KB–3.4 MB on disk. Both components rendered them through
`next/image`:

```tsx
<Image src={thumbnailCover} alt={...} fill sizes="600px" className="object-cover object-left ..." />
```

`sizes="600px"` looks like it should make `next/image` generate a
density-aware `srcset` (1x/2x/3x variants) — that's the whole point of the
prop. It doesn't, for these files, and that's the root of the bug.

---

## 2. Why `sizes` was silently a no-op

`next.config.ts` has no `images` key at all, so every option falls back to
Next's default — critically, **`dangerouslyAllowSVG: false`**. Inside
`next/image`'s prop-generation code (`next/dist/shared/lib/get-img-props.js`):

```js
if (isDefaultLoader && !config.dangerouslyAllowSVG && src.split('?', 1)[0].endsWith('.svg')) {
    // Special case to make svg serve as-is to avoid proxying
    // through the built-in Image Optimization API.
    unoptimized = true;
}
```

Any `.svg` source, with the default config, is forced into
`unoptimized = true` — regardless of the `sizes`/`fill` props written in the
component. That flag then short-circuits the function that builds the
`srcset`:

```js
function generateImgAttrs({ config, src, unoptimized, width, quality, sizes, loader }) {
    if (unoptimized) {
        // ...
        return { src, srcSet: undefined, sizes: undefined };
    }
    const { widths, kind } = getWidths(config, width, sizes); // never reached
    // ...
}
```

So the DOM ends up with a bare `<img src="/thumbnails/x.svg">` — no
`srcset`, no `sizes` — and the browser is entirely on its own for deciding
how to rasterize that SVG for the display it's on.

(Enabling `images.dangerouslyAllowSVG: true` does **not** fix this, and it's
worth knowing why not before trying it: SVG is in Next's server-side
`BYPASS_TYPES` list — even with the flag on, the image-optimizer endpoint
just returns the original file bytes unchanged for every requested width. It
only stops a 400 rejection; it doesn't make Next rasterize the SVG at a
useful resolution. This looked like the obvious one-line fix and isn't.)

---

## 3. Isolating the real variable: `<img>` vs. inline `<svg>`

The working theory going in was "some DPR-driven upscale of a fixed-resolution
raster" — plausible, but genuinely testable rather than assumed. The
decisive move was using **Playwright's real WebKit browser**, not just
Chromium: Apple requires every iOS browser (Safari *and* Chrome-for-iOS) to
use WebKit under the hood, so a desktop WebKit build is a much closer proxy
for "what the user's phone does" than any Chromium-based tool, even in
mobile-device-emulation mode.

The test rendered the *same byte-identical* SVG file two ways, side by side,
at the real container size (358×296 CSS px — the actual home-card width on a
~390px phone) and a real mobile device-pixel-ratio (3x):

```html
<div style="width:358px;height:296px;overflow:hidden">
  <img src="commandLine.svg" style="width:100%;height:100%;object-fit:cover;object-position:left">
</div>
<div style="width:358px;height:296px;overflow:hidden">
  <svg width="100%" height="100%" preserveAspectRatio="xMinYMid slice">...(same content)...</svg>
</div>
```

Screenshotting both, cropped to the exact box, at `deviceScaleFactor: 3`:

| Engine | DPR | `<img src>` | inline `<svg>` |
|---|---|---|---|
| WebKit | 1 | **blurry** | crisp |
| WebKit | 3 | **blurry** | crisp |
| Chromium | 1 | **blurry** | crisp |
| Chromium | 3 | sharp | crisp |

The `<img>` column looked like a photo out of focus — body text ("Jobs 4",
table rows) genuinely illegible. The inline `<svg>` column was pixel-crisp in
**every** cell, no exceptions.

Notice the pattern doesn't cleanly match "DPR causes it" (WebKit is blurry at
DPR 1 *and* 3; Chromium is fine at DPR 3 but not DPR 1) — this is a real,
inconsistent, engine-specific quirk in how `<img>`-embedded SVGs get
decoded/rasterized/cached, not a single clean rule. That inconsistency is
exactly why guessing a fix from first principles is risky here, and why the
controlled side-by-side comparison mattered more than a tidy theory. What
*is* consistent, and is the only thing the fix needs to rely on: **inline
`<svg>` never goes through that pipeline at all** — it's drawn as native
vector geometry directly by the layout/paint engine, so there's no
raster-decode step to get wrong in the first place.

This also explains the user's exact repro: real phones are always WebKit,
so they hit the consistently-blurry path; desktop resizing never changes
*which rendering path* is used (still `<img>`, still whatever the desktop
browser/DPR combination happens to do), so on a machine/browser where that
happens to land in a "sharp" cell, no amount of resizing reveals the bug.

---

## 4. The fix: render the SVG inline, not through `next/image`

A small server-only helper reads the file and adapts its root tag for inline
embedding:

```ts
// src/lib/inline-svg.ts
export function getInlineSvg(publicPath: string, preserveAspectRatio: string): string {
    const filePath = path.join(process.cwd(), "public", publicPath);
    const raw = readFileSync(filePath, "utf8");

    return raw.replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
        const stripped = attrs
            .replace(/\s*width="[^"]*"/, "")
            .replace(/\s*height="[^"]*"/, "");
        return `<svg${stripped} width="100%" height="100%" preserveAspectRatio="${preserveAspectRatio}" role="presentation" aria-hidden="true">`;
    });
}
```

`CaseStudyCard.tsx` and `CaseStudyDetail.tsx` are both Server Components
themselves (no `"use client"` in either file) — but that alone isn't enough
to safely call `getInlineSvg` *inside* them. See §5 for why, and for the
actual final call pattern (the caller computes the string, the component just
renders it). The shape once corrected:

```tsx
<div className="relative h-[296px] w-full overflow-hidden bg-surface">
    {thumbnailSvg && (
        <div
            role="img"
            aria-label={`${title} preview`}
            className="absolute inset-0"
            dangerouslySetInnerHTML={{ __html: thumbnailSvg }}
        />
    )}
</div>
```

Two details worth calling out:

- **`preserveAspectRatio` replaces `object-fit`/`object-position`.** SVG's
  own cropping mechanism is the equivalent lever once you're not using
  `<img>`: `xMinYMid slice` = "anchor left, crop to fill" (matches the old
  `object-cover object-left`); `xMidYMid slice` = "anchor center, crop to
  fill" (matches a plain `object-cover`).
- **Accessibility doesn't regress.** The `<img alt="...">` this replaces
  needed a stand-in: the wrapper div carries `role="img"` +
  `aria-label`, and the injected SVG's own root tag gets
  `role="presentation" aria-hidden="true"` so its internals (hundreds of
  meaningless `<path>`s to a screen reader) don't leak into the accessibility
  tree alongside the wrapper's label.
- **`draggable={false}`/`[-webkit-user-drag:none]` (on the old `<img>`) were
  dropped, not replaced.** They existed to suppress the browser's native
  "drag this image out" affordance — which is an `<img>`-specific behavior.
  Inline DOM content was never draggable that way, so there's nothing left
  to suppress.

---

## 5. A second bug: the fix broke the Vercel build

The version above — `CaseStudyCard`/`CaseStudyDetail` each calling
`getInlineSvg` directly — passed `pnpm dev`, passed a clean visual check, and
still **failed `pnpm build`** on the next Vercel deployment:

```
Module not found: Can't resolve 'fs'
> 1 | import { readFileSync } from "fs";

Import traces:
  Client Component Browser:
    ./src/lib/inline-svg.ts [Client Component Browser]
    ./src/components/case-study/CaseStudyDetail.tsx [Client Component Browser]
    ./src/components/case-study/CaseStudyOverlay.tsx [Client Component Browser]
```

### Why `pnpm dev` didn't catch it

Turbopack's dev server compiles routes on demand, lazily, as they're
visited — the intercepted `@modal` route (the one that pulls `CaseStudyDetail`
into a client bundle, see below) simply hadn't been hit yet in the session
that "passed." `pnpm build` compiles every route up front, so it's the only
reliable way to catch a bundling error like this locally — a clean `pnpm dev`
session proves nothing about routes you haven't navigated to.

### The actual mechanism

`CaseStudyDetail` is a plain Server Component with no `"use client"` of its
own — but it's rendered in two different contexts:

- directly inside `work/[slug]/page.tsx` (a Server Component) — fine on its
  own.
- inside `CaseStudyOverlay.tsx`, which **is** `"use client"`.

React's Server/Client Component model doesn't let a Client Component import
an arbitrary module and trust it'll only ever execute on the server — once
`CaseStudyOverlay` (client) directly renders `<CaseStudyDetail />`, everything
`CaseStudyDetail` imports has to be resolvable in the **client** bundle too,
including `inline-svg.ts`, including `fs`. Browsers don't have `fs`. Build
fails — for the *whole* app, not just the overlay path, because it's one
shared module.

This is the same shape of bug as `§5` in `learn/dashed-borders.md` (a
different file, coincidental numbering): a mechanism that operates on the
*module graph*, invisible from reading either component's own JSX in
isolation. `CaseStudyDetail.tsx` never mentions the client boundary; you only
see it by tracing *who renders this component*.

### The fix: compute the string above the client boundary, pass it as a prop

Move every `getInlineSvg` call up to the nearest genuine Server Component
that isn't itself reachable from a client-rendered tree, and pass the
resulting **string** down as an ordinary prop — a plain string is fine to
hand to a Client Component; it's the `fs`-touching *function* that isn't.

```tsx
// src/app/@modal/(.)work/[slug]/page.tsx — a Server Component
const thumbnailSvg =
    study.thumbnailCover && getInlineSvg(study.thumbnailCover, "xMidYMid slice");
return <CaseStudyOverlay study={study} thumbnailSvg={thumbnailSvg} />;
```

```tsx
// CaseStudyOverlay.tsx — "use client"; just forwards the string, never
// imports inline-svg.ts itself
<CaseStudyDetail study={study} thumbnailSvg={thumbnailSvg} />
```

`CaseStudyDetail` and `CaseStudyCard` no longer import `inline-svg.ts` at
all — they just render whatever string they're handed. Even though
`CaseStudyCard` was never actually reachable from a client tree (only
`CaseStudyDetail` was), it was switched to the same pattern anyway: leaving
one sibling compute-its-own-SVG and the other receive-it-as-a-prop is exactly
the kind of asymmetry that invites someone to "fix" it back into this bug
later, the moment `CaseStudyCard` ends up rendered from a client component
too.

---

## 6. Verification

Re-ran the same before/after WebKit comparison against the actual dev
server after the change landed (not just the isolated test file), and
separately loaded the real home page and a case-study detail page in
Chromium at `deviceScaleFactor: 3` — the same body text that was mush
through `<img>` (`"v1.4.0"`, `"Migrated entire color palette from hex/HSL to
perceptually uniform OKLCH color space"`, sidebar nav items) was fully
legible. No visual regression in crop/position, no console errors, and
`tsc --noEmit` stayed clean.

After §5's fix, verification also had to include the thing that actually
broke: a full **`pnpm build`** (not just `pnpm dev`) locally, confirming all
four routes compile — `/`, the intercepted `(.)work/[slug]`, and the static
`/work/[slug]` pages — followed by `next start` against the real production
output and a curl/DOM check that both the home cards and a case-study detail
page still contain the expected inline `<svg>` markup.

---

## 7. Lessons to carry forward

- **"Sharp on desktop, blurry on mobile, resizing the desktop window doesn't
  change anything" is a strong signal to stop thinking about CSS/breakpoints
  and start thinking about the *device* — DPR, decode/raster behavior,
  engine differences.** Desktop resizing changes the viewport; it does not
  change which browser engine or pixel density is rendering the page.
- **`next/image` treats SVG as a special case, and the default config opts
  it out of everything the component is supposed to give you** (responsive
  `srcset`, optimization) — silently. A `sizes` prop that looks correct in
  the JSX can still be dead code; check the actual rendered `<img>` tag, not
  just the source.
- **A config flag that sounds like the fix (`dangerouslyAllowSVG`) can be a
  dead end for a different reason than the one you'd guess** (SVG is
  bypassed from server-side optimization regardless) — read the actual
  library source before trusting a plausible-sounding one-line config
  change.
- **When a bug is specifically about *rendering fidelity* on a real device,
  test with the real engine.** Playwright's WebKit build is desktop WebKit,
  not iOS Safari — not a perfect stand-in — but it shares the core
  rendering/decode pipeline in a way Chromium-with-device-emulation simply
  doesn't, and it was enough to reproduce and isolate this exact bug.
- **Don't force a tidy theory onto a messy result.** The blur pattern across
  engine/DPR combinations here didn't reduce to one clean rule ("DPR causes
  it" doesn't hold up). The fix didn't need to explain *why* each cell came
  out the way it did — only to find the one variable (`<img>` vs. inline)
  that was consistent across all of them.
- **Inline `<svg>` sidesteps image-decode quirks entirely**, at the cost of
  shipping the markup in the HTML instead of as a separately cached request —
  worth it here since these files were already being fetched per-view
  anyway, and correctness/sharpness mattered more than that tradeoff for a
  handful of hero-ish showcase images.
- **A Server Component isn't automatically safe to import a `fs`-touching
  module from — check who renders it, not just what it declares.** A
  component with no `"use client"` at the top can still end up bundled for
  the browser if *any* client component renders it directly. The rule to
  actually check: trace every place a component is rendered, not just the
  file itself.
- **`pnpm dev` did not catch this; only a full `pnpm build` did.** Turbopack
  dev compiles routes lazily as you visit them — a route you never navigated
  to in that session tells you nothing. Build errors that are really about
  bundling/module-graph shape need the full, non-lazy build to surface
  locally, before Vercel finds them for you.

---

## 8. Quick reference

```ts
// src/lib/inline-svg.ts — read a trusted local SVG, adapt it for inline embedding
getInlineSvg(publicPath: string, preserveAspectRatio: string): string
```

```tsx
// Call getInlineSvg in a Server Component NOT reachable from a client tree —
// e.g. the route/page that renders CaseStudyOverlay, not CaseStudyOverlay
// itself. Pass the resulting string down as a prop.
const thumbnailSvg = thumbnailCover && getInlineSvg(thumbnailCover, "xMinYMid slice");

<div role="img" aria-label="..." dangerouslySetInnerHTML={{ __html: thumbnailSvg }} />
```

- Blurry only on real mobile, fine on desktop-resized-narrow → think DPR/engine,
  not CSS.
- `next/image` + `.svg` + default config → forced `unoptimized`, `srcset`/`sizes`
  silently dropped.
- `dangerouslyAllowSVG: true` alone doesn't help — SVG bypasses server-side
  rasterization either way.
- Fix: inline `<svg>` (native vector paint, no raster-decode step) instead of
  `<img>`/`next/image`. `preserveAspectRatio` (`xMinYMid slice` / `xMidYMid slice`)
  replaces `object-fit`/`object-position`. Re-add the accessible name via
  `role="img"`/`aria-label` on the wrapper + `aria-hidden` on the injected SVG.
- **Call the `fs`-reading helper only from a Server Component that's never
  rendered by a `"use client"` component** — pass the resulting string down
  as a prop instead of importing the helper deeper in the tree. Verify with a
  full `pnpm build`, not just `pnpm dev`.
