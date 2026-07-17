# Inline SVG Thumbnails — Old Code vs. New Code, Explained

This is the **code walkthrough** companion to `svg-thumbnail-blur.md`. That
doc is the detective story (three generations of blur, how each was
diagnosed); this one sits at the code level and answers: *what exactly
changed in the files, what does every line do, and how do the two
approaches differ in how a browser turns them into pixels?* Written to be
readable as a junior web developer.

The two implementations compared here are the final two contenders:

- **OLD:** raster WebP files served through a plain `<img srcset>` — the
  best-possible version of the raster approach (pixel-exact files, no
  optimizer in the way).
- **NEW (current):** the SVG markup embedded **inline** into the page HTML —
  no image file, no image request, the browser paints the vectors directly.

(The even-older `next/image` variants are covered in `svg-thumbnail-blur.md`
§2 and §9 — they lost for their own reasons and aren't re-explained here.)

---

## 1. First, a mental model: three ways to put a picture on a page

| | Raster in `<img>` (WebP/PNG/JPG) | SVG in `<img src="x.svg">` | Inline `<svg>` in the HTML |
|---|---|---|---|
| What the file contains | A grid of colored pixels | Vector *instructions* (paths, fills) | Same instructions, pasted into the page |
| How the browser draws it | Downloads, decodes, then **scales the pixel grid** to the layout size | Downloads, then rasterizes it internally through its *image-decode* pipeline | Parses it as DOM and **paints the geometry directly**, like it paints text |
| Crisp at any zoom / any screen? | Only if the file's pixels match the screen's pixels 1:1 | Should be — but engines have real bugs here (measured in §3 of the blur doc) | **Yes, always** — repainted from the math at every scale |
| Cached separately? | Yes (one download, reused across pages) | Yes | **No** — it ships inside every page's HTML |
| Weight on the page | HTML stays tiny | HTML stays tiny | HTML carries the whole drawing |

Figma analogy: a raster `<img>` is **placing an exported PNG** into a frame.
Inline `<svg>` is **pasting the vector layers themselves** into the frame —
they re-render perfectly at any size, but now your file carries all those
layers everywhere it goes.

The portfolio's thumbnails are hairline-heavy UI illustrations where
crispness is the point — which is why the last row of trade-offs (weight)
was accepted to win the third row (always crisp).

One more term used everywhere below — **DPR (device pixel ratio)**: how many
physical screen pixels sit behind one CSS pixel. A MacBook Retina display is
DPR 2 (a "552px wide" image really covers 1104 hardware pixels), iPhones are
DPR 3. Rasters must supply enough pixels for the *physical* grid or they
look soft; vectors don't care.

---

## 2. The data layer — one field, two eras

Everything starts in the study content files. Each case study points at its
artwork:

```ts
// OLD — src/lib/case-studies/command-line.ts
thumbnailBase: "/thumbnails/commandLine",
// a BASE path: components appended "-552.webp", "-1104.webp", … themselves
```

```ts
// NEW — src/lib/case-studies/command-line.ts
thumbnailCover: "/thumbnails/commandLine.svg",
// a real file path: the SVG master itself, read from /public on the server
```

Why the field was *renamed* both times rather than reused: if any component
still referenced the old field, TypeScript fails the build immediately
(`thumbnailBase does not exist on type CaseStudy`). Reusing the same name
with new meaning would compile fine and 404 at runtime — a rename turns a
silent runtime bug into a loud compile error. Cheap insurance.

---

## 3. OLD code: pixel-exact WebPs via `<img srcset>`

The raster era's final form. A script (`pnpm thumbs`, still in
`scripts/render-thumbnails.mjs`) rendered the SVG master into a WebP at
**every size the layout actually draws** — 552/1104/1656 wide for the home
card (1×/2×/3× of its fixed 552×296 box) — and the component listed them all:

```tsx
// OLD — src/components/ui/CaseStudyCard.tsx (thumbnail slot)
<div className="relative h-[296px] w-full overflow-hidden bg-surface">
    {thumbnailBase && (
        <img
            src={`${thumbnailBase}-1104.webp`}
            srcSet={`${thumbnailBase}-552.webp 552w, ${thumbnailBase}-1104.webp 1104w, ${thumbnailBase}-1656.webp 1656w`}
            sizes="552px"
            alt={`${title} preview`}
            fetchPriority={isFirst ? "high" : undefined}
            loading={isFirst ? undefined : "lazy"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-left"
        />
    )}
</div>
```

Line by line:

- **`srcSet`** — a menu of the same picture at different widths, each
  labeled with its true pixel width (`552w` = "this file is 552px wide").
- **`sizes="552px"`** — tells the browser how wide the image will be *drawn*
  in CSS px, **before** CSS loads (the browser picks a file from the menu
  while still parsing HTML, so it can't wait to measure the layout). It
  multiplies this by the screen's DPR: Retina Mac → 552 × 2 = 1104 → picks
  the `1104w` file. Exact match → painted 1:1, no scaling.
- The subtle part (this exact line once carried a bug): the card's box
  *narrows* on phones, but `sizes` stays `552px` — because the box has a
  **fixed height** and the image `object-cover`s it, the image is always
  *drawn* ~552 CSS px wide and narrow boxes just crop the right edge.
  `sizes` must describe the **drawn** width, not the visible box. Getting
  this wrong made 3× iPhones download a too-small file and upscale it
  (blur doc §9).
- **`src`** — the fallback for ancient browsers that ignore `srcSet`.
- **`fetchPriority="high"`** on the first card only — it's the **LCP**
  (Largest Contentful Paint: the biggest thing above the fold, the element
  page-speed metrics time). The hint tells the browser to fetch it before
  less-important resources.
- **`loading="lazy"`** on the others — below the fold, so don't download
  until the user scrolls near them.
- **`decoding="async"`** — decode the pixels off the main thread; don't
  block rendering the rest of the page.
- **`object-cover object-left`** — CSS-side cropping: fill the box, keep the
  left edge visible, crop the right (matching the Figma crop).

**Why it was built:** mechanically it's the strongest raster can be — the
browser downloads a file whose pixels map 1:1 onto the screen's pixels at
DPR 1, 2, and 3, with zero runtime resizing or re-encoding.

**Why it still lost:** two things no raster can escape.

1. A 1:1 raster is still *someone else's rendering, frozen*. The files were
   rasterized by librsvg (the library `sharp` uses) — its antialiasing and
   filter rendering aren't the browser engine's own vector paint, and on
   hairline UI art a trained eye sees the difference.
2. Fixed pixel sizes can't survive the real world's scale factors: browser
   zoom, macOS "more space" display scaling (the OS renders at 2× then
   downsamples the whole screen), pinch-zoom. Each adds a resample. A vector
   re-renders through all of them, perfectly.

---

## 4. NEW code: the inline SVG pipeline, file by file

The data flows through four stops. Folder map first:

```
src/lib/case-studies/*.ts        the study data: thumbnailCover = "/thumbnails/x.svg"
        │
        ▼
src/lib/inline-svg.ts            getInlineSvg(): reads the file (Node fs),
        │                        rewrites its root <svg> tag for embedding
        ▼   called ONLY from Server Components:
        │     • src/components/sections/CaseStudies.tsx      (home cards)
        │     • src/app/work/[slug]/page.tsx                 (hard-loaded study page)
        │     • src/app/@modal/(.)work/[slug]/page.tsx       (soft-nav overlay)
        ▼
CaseStudyOverlay.tsx             "use client" — can't read files; just FORWARDS
        │                        the ready-made string down as a prop
        ▼
CaseStudyCard.tsx /              render the string with dangerouslySetInnerHTML
CaseStudyDetail.tsx              inside a role="img" wrapper
```

### 4.1 `src/lib/inline-svg.ts` — the whole trick in one function

```ts
import { readFileSync } from "fs";
import path from "path";

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

- **`readFileSync`** is Node's file-reading API. It exists on the server
  only — a browser has no filesystem. This single import is what makes
  *where this function is called from* a big deal (§4.2).
- **`path.join(process.cwd(), "public", publicPath)`** — `process.cwd()` is
  the project root at runtime; files in `/public` are addressed by URL paths
  like `/thumbnails/x.svg`, so this converts the URL-style path back into a
  real disk path.
- **The `replace()`** rewrites only the opening `<svg …>` tag (the regex
  matches the first `<svg` + its attributes) and leaves the thousands of
  lines of drawing untouched:
  - strips the export's fixed `width="552" height="296"` and sets
    `width="100%" height="100%"` — the drawing now stretches to whatever box
    the component puts it in, instead of insisting on its native size;
  - injects **`preserveAspectRatio`** — SVG's built-in crop control, passed
    in by the caller because the two slots crop differently (§4.4);
  - adds **`role="presentation" aria-hidden="true"`** — hides the SVG's
    internals (hundreds of meaningless `<path>`s) from screen readers; the
    *wrapper* will carry the accessible name instead (§4.3).

### 4.2 The call sites — and why they're exactly there

```tsx
// src/components/sections/CaseStudies.tsx  (a Server Component — home page)
<CaseStudyCard
    …
    thumbnailSvg={
        study.thumbnailCover &&
        getInlineSvg(study.thumbnailCover, "xMinYMid slice")
    }
/>
```

```tsx
// src/app/work/[slug]/page.tsx  (a Server Component — hard load / refresh)
const thumbnailSvg =
    study.thumbnailCover && getInlineSvg(study.thumbnailCover, "xMidYMid slice");
return (
    <>
        <HomeContent />
        <CaseStudyOverlay study={study} thumbnailSvg={thumbnailSvg} closeHref="/" />
    </>
);
```

(The `@modal/(.)work/[slug]/page.tsx` intercepted route does the same as the
second snippet, minus `closeHref`.)

Two things to understand here:

**The `&&` idiom and the `string | false` prop type.** In JS,
`a && b` returns `a` if it's falsy, else `b`. So when a study has no
`thumbnailCover`, the whole expression is `undefined`-ish (`false` after the
`&&`), and when it does, it's the SVG string. That's why the receiving prop
is typed `thumbnailSvg?: string | false` and the JSX guards with
`{thumbnailSvg && …}` — the empty-box fallback costs one `&&`, no `if`.

**Why the function runs *here* and not inside the components that render
it.** This is the most transferable Next.js lesson in the repo. In the App
Router, a component is a **Server Component** by default (runs on the
server, may use `fs`) unless a `"use client"` file pulls it into the browser
bundle. `CaseStudyOverlay.tsx` *is* `"use client"` (it manages open/close
state and animations) — and it renders `CaseStudyDetail`. That means
`CaseStudyDetail` and everything it imports **must be bundlable for the
browser** — where `fs` doesn't exist. Import `inline-svg.ts` one level too
deep and the whole build fails with `Module not found: Can't resolve 'fs'`.

So the rule encoded here: **do the file-reading in the page/section level
(true Server Components), and pass the finished *string* down.** A string is
plain data — it serializes across the server/client boundary happily; the
`fs`-touching *function* does not. The client overlay just forwards it:

```tsx
// CaseStudyOverlay.tsx ("use client") — receives and forwards, never imports inline-svg.ts
<CaseStudyDetail study={study} thumbnailSvg={thumbnailSvg} />
```

Bonus trap this already caught once (blur doc §5): `pnpm dev` compiles
routes lazily as you visit them, so this mistake can *look* fine in dev and
still break the production build. Always run a full `pnpm build` after
touching anything on this path.

### 4.3 The render — `dangerouslySetInnerHTML` and the a11y wrapper

```tsx
// NEW — src/components/ui/CaseStudyCard.tsx (thumbnail slot)
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

- **`dangerouslySetInnerHTML`** is React's escape hatch for injecting a raw
  HTML string into the DOM. The scary name is deliberate: if that string
  ever contained user input, it would be an XSS hole (someone could inject a
  `<script>`). Here it's safe **because the string comes from our own files
  in `/public`, checked into the repo** — the rule to carry with you is
  *"trusted, static, ours → fine; anything user-influenced → never."*
- **The wrapper carries the accessibility** the old `<img alt="…">` used to
  provide: `role="img"` tells assistive tech "treat this whole box as one
  image," and `aria-label` is the alt text. Meanwhile the injected SVG's
  root tag was stamped `role="presentation" aria-hidden="true"` in §4.1, so
  a screen reader hears exactly one thing — "Command line to control room
  preview, image" — instead of hundreds of anonymous vector paths.
- The detail page (`CaseStudyDetail.tsx`) has the identical pattern in its
  `aspect-[736/394]` box, with `aria-label={study.title}`.

### 4.4 `preserveAspectRatio` — object-fit's vector twin

The old code cropped with CSS (`object-cover object-left`); those properties
only apply to *replaced elements* like `<img>`. Inline SVG has its own,
older mechanism, and the caller picks it per slot:

| CSS on `<img>` (old) | SVG attribute (new) | Meaning |
|---|---|---|
| `object-cover object-left` | `preserveAspectRatio="xMinYMid slice"` | fill the box, anchor the **left** edge, crop the right — the home card |
| `object-cover` (center) | `preserveAspectRatio="xMidYMid slice"` | fill the box, center, crop both edges evenly — the detail hero |

Decoder ring: `xMin/xMid/xMax` + `YMin/YMid/YMax` = which point of the
drawing stays pinned; `slice` = "scale up until the box is fully covered and
crop the overflow" (`meet` would be the letterboxing opposite — like
`object-contain`). Same Figma concept as a fill-cropped image in a frame.

---

## 5. Old vs. new — the approaches side by side

| | OLD: exact-size WebPs + `<img srcset>` | NEW: inline `<svg>` |
|---|---|---|
| Where the image bytes live | 3–7 separate `.webp` files per study, cached by the browser once | Inside every page's HTML, re-shipped per page |
| Network requests | 1 per drawn thumbnail (lazy where possible) | 0 — it *is* the document |
| How pixels get made | Pre-rasterized by librsvg at build-tool time; browser pastes the grid | Painted by the browser's own vector engine at view time |
| DPR / zoom / display scaling | Exact at 1×/2×/3×; softens under zoom or scaled displays | Perfect at every scale, always |
| Home page HTML | ~36 KB | **2.9 MB raw / 538 KB gzipped** |
| Lazy-loading / LCP hints | `loading="lazy"`, `fetchPriority="high"` | Not applicable — markup is parsed with the page (part of the cost) |
| Accessibility | `alt` on the `<img>` | `role="img"` + `aria-label` wrapper, internals `aria-hidden` |
| Cropping | CSS `object-fit`/`object-position` | SVG `preserveAspectRatio` |
| Server/client concerns | None — `<img>` renders anywhere | `fs` read must stay in Server Components; string threaded down |
| The verdict | Provably 1:1, still visibly "a raster" to a trained eye | The quality ceiling — chosen deliberately, weight accepted |

Two honest footnotes on the weight number:

- **Gzip is doing heavy lifting.** SVG is repetitive XML text, which
  compresses ~5×; the wire cost is 538 KB, not 2.9 MB. Rasters barely
  compress further (WebP is already compressed). This is why "11 MB" era
  pages were only ~3.7 MB on the wire — still terrible, but the multiplier
  matters when comparing text vs. binary formats.
- **Inlining forfeits caching.** The same three drawings re-download inside
  *every* page's HTML, where the old `.webp` files downloaded once and were
  reused across the whole site. That's the structural cost of inline, beyond
  the raw size.

The masters being inlined are the **SVGO-optimized** files (~70 % smaller
than the raw Figma exports, drawing untouched) — that's why this revert
costs 2.9 MB and not the original 11.2 MB. And the raster tooling
(`pnpm thumbs`) stays in `scripts/` for whenever the weight question is
reopened.

---

## 6. Gotchas checklist (the bugs this code has already survived)

1. **`fs` anywhere reachable from a `"use client"` component kills the
   build, not dev.** Trace *who renders a component*, not just its own
   imports — and verify with `pnpm build`, never just `pnpm dev` (§4.2).
2. **`dangerouslySetInnerHTML` only ever gets trusted, repo-owned
   content.** The moment a string is user-influenced, this pattern is an
   XSS vulnerability (§4.3).
3. **Multiple SVGs inlined into one page share one id namespace.** The three
   thumbnails all define filters/clipPaths with ids; if two files used the
   same id, one's drop-shadow could hijack the other's. This is why SVGO ran
   with `cleanupIds: { minify: false }` — minified ids (`a`, `b`, `c`) would
   have collided across files.
4. **If you ever go back to rasters: `sizes` describes the *drawn* width,
   not the box width.** Under `object-cover` in a fixed-height box the drawn
   width never changes as the box narrows — reporting the box width makes
   high-DPR phones download too little and upscale (blur doc §9).
5. **`<img src="x.svg">` is not a safe middle ground.** It keeps the HTML
   small *and* the vector format, but real engines rasterize it through the
   image-decode pipeline with measured blur (blur doc §3's matrix). The two
   honest options are the ones in this doc.
