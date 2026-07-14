# "No Way Home" After a Refresh — Finding Two Bugs, Then Redesigning Around Them

The story of a bug report that started as "I can't get back to home" and ended
as a redesign of how the standalone case-study page works — plus three false
alarms during verification that are worth knowing about on their own.

Supersedes part of `learn/case-study-modal.md`'s original spec (its point 5 and
the "full standalone page" framing throughout) — that doc describes the
*previous* standalone-page design; this one explains why it changed and what
replaced it.

The files: `src/components/case-study/CaseStudyOverlay.tsx`,
`src/app/work/[slug]/page.tsx`, `src/components/sections/HomeContent.tsx` (new),
`src/components/layout/Sidebar.tsx`, `src/components/layout/MobileNavPill.tsx`.

---

## 1. The report

> "I open a case study, the modal opens. If I refresh the browser window
> after that, I'm not able to go back to the home page — the visible home
> page behind the case-study overlay also disappears. The only way back is
> typing the URL in manually."

Two things tangled together in that one report, and pulling them apart
mattered:

1. **A real navigation bug** — refreshing genuinely leaves you with no
   working way back to `/`.
2. **A design question in disguise** — "the home page behind the overlay
   disappears" isn't a bug on its own. A hard refresh of `/work/<slug>` was
   *always* going to render a different page than the soft-nav overlay (see
   `case-study-modal.md` — intercepting routes only intercept in-app
   navigation). Whether that different page should *also* show a dimmed home
   page behind it, or just be its own standalone thing, is a decision, not a
   defect. That distinction is why this doc has both a "bug fixes" half and a
   "redesign" half.

---

## 2. Bug 1 (desktop, ≥900px) — confirmed, no ambiguity

Loaded `/work/design-system` directly (simulating the refresh) at 1280px and
enumerated every `<a>` on the page. Only one linked to `/` at all: `BackNav`
(`href="/"`) — and it was `display: none`:

```tsx
// BackNav.tsx (before this fix)
const pillClassName = `fixed bottom-10 left-1/2 z-50 ... min-[900px]:hidden ${...}`;
```

`min-[900px]:hidden` is *correct* for `BackNav`'s other caller, the
intercepted overlay — at that width, the overlay is a dimmed modal with the
real home page (and Sidebar) already visible/mounted behind it, so a second
"Back" pill would be redundant. But the standalone page reused `BackNav`
as-is, and Sidebar's own ≥900px content at the time was just identity text
(not a link) plus four `target="_blank"` external links. Nothing pointed
home. This tier was evidently never designed for "arrived here with no
history to reverse" — no Figma reference exists for it, unlike the <900px
full-bleed tier.

---

## 3. Bug 2 (mobile/tablet, <900px) — reasoned, never fully confirmed

Here `BackNav` isn't hidden, and every simulated test said it should work:
correct position, correct element on top in hit-testing, no console or
hydration errors, `mouse.click()` and `touchscreen.tap()` both succeeded.
Real WebKit — which is what actually caught the SVG-blur bug Chromium
couldn't (`learn/svg-thumbnail-blur.md`) — couldn't even reach this sandbox's
dev server to test against (same networking limitation hit during that
investigation).

Talking it through narrowed it a lot faster than more automated testing
would have: **the regular home-page bottom nav works fine on the same
phone**, which rules out a blanket "fixed bottom buttons are unreliable on
this device" explanation (e.g. the browser's own dynamic toolbar/safe-area
overlapping that screen region — that would break *every* bottom pill
equally, not just this one). So it's something specific to the case-study
page, and the one real structural difference is: on that page, `BackNav`
shares its exact screen position (`fixed bottom-10 left-1/2`) with Sidebar's
own bottom-pill tier — `MobileNavPill` below 600px, Sidebar's own pill at
600-900px — which is *still mounted* (it's part of the root layout, present
on every route) and only kept out of the way by stacking order
(`BackNav`'s `z-50` vs. the pill's `z-40`), not by not existing.

That's exactly the kind of layered, same-position, different-DOM-node setup
that's fragile on real touch hardware in ways synthetic clicks don't reliably
reproduce, and it's also just semantically redundant — `BackNav`'s own
existing comment already says it's meant to *fully replace* Sidebar's pill
here. So the fix doesn't try to prove the exact touch-interference mechanism;
it removes the redundant, still-mounted control from the DOM entirely
whenever it doesn't need to exist, closing off the whole category of risk
rather than continuing to rely on layering to hide something that's still
there. **This is the one piece of this doc that still needs a human with a
real phone to fully confirm** — mirroring `learn/dashed-borders.md` §6c's
honesty about a zoom bug that couldn't be automated-verified either.

---

## 4. The scope question, asked directly instead of assumed

Before fixing just the navigation, it was worth asking: *should* the
standalone page look like the overlay (home page dimmed behind it), or is
"case-study content only, no home behind it" actually fine — the same
pattern most sites use for a deep-linked modal (e.g. a shared photo/lightbox
URL)?

Presented both options with previews rather than picking one. The answer
picked the bigger option: make the standalone page visually
indistinguishable from the soft-nav overlay. Worth calling out *why* this
was worth asking rather than assuming: the "smaller" fix (just patch
navigation, leave the standalone page as-is) is objectively less risky and
less code — but it doesn't actually address what was reported ("the home
page behind it disappears"). Guessing wrong here would have meant redoing a
non-trivial redesign, or shipping something that technically fixes the
literal navigation bug while leaving the reporter still unhappy.

---

## 5. The redesign: one shared presentation, two closing behaviors

**`CaseStudyOverlay` becomes the single component behind both a soft
navigation and a fresh page load.** Same dimmed/full-bleed modal, same
`BackNav`, same Escape/backdrop-click closing, same entrance animation. The
only thing that differs is *what closing does* — and that difference already
had a name and a shape, because `BackNav` had solved exactly this problem for
itself already:

```tsx
// BackNav.tsx — already had this shape, well before this fix
type Props =
    | { href: string; onClick?: undefined }
    | { href?: undefined; onClick: () => void };
```

`CaseStudyOverlay` gets the same shape, one level up, as an optional
`closeHref` prop:

```tsx
// CaseStudyOverlay.tsx
const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpen(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
        () => (closeHref ? router.push(closeHref) : router.back()),
        reduce ? 0 : 520,
    );
}, [router, closeHref]);

// ...
{closeHref ? (
    <BackNav href={closeHref} open={open} />
) : (
    <BackNav onClick={close} open={open} />
)}
```

- **Not provided** (the intercepted overlay, `@modal/(.)work/[slug]/page.tsx`):
  behavior is *exactly* what it was before this fix — `router.back()`,
  `BackNav` gets `onClick`. Zero behavior change for the already-working
  soft-nav path.
- **Provided as `"/"`** (the new standalone use): there's no in-app history
  to reverse on a fresh load, so closing — via Escape, backdrop click, *or*
  `BackNav` — pushes there directly instead.

**The home page's content had to become renderable from two places.**
Extracted verbatim into `src/components/sections/HomeContent.tsx`;
`src/app/page.tsx` is now just `export { default } from
"@/components/sections/HomeContent";`. `work/[slug]/page.tsx` collapses from
two duplicated breakpoint-specific blocks plus its own `BackNav` call down to:

```tsx
const thumbnailSvg =
    study.thumbnailCover && getInlineSvg(study.thumbnailCover, "xMidYMid slice");
return (
    <>
        <HomeContent />
        <CaseStudyOverlay study={study} thumbnailSvg={thumbnailSvg} closeHref="/" />
    </>
);
```

**Why `<HomeContent />` and `<CaseStudyOverlay />` can just sit next to each
other as plain children, instead of needing the parallel-route `{modal}`
slot the intercepted case uses:** `CaseStudyOverlay`'s outer box is
`position: fixed`, which positions against the viewport (or the nearest
transformed ancestor) regardless of DOM nesting depth. Nothing between it and
`<body>` in either rendering path — `layout.tsx`'s `snap-gutter-r` wrapper,
the Sidebar-flex-row div — sets a `transform`/`filter`/`contain` that would
change that. So it paints and hit-tests identically whether it arrives via
`{modal}` (a sibling of the whole Sidebar+content row) or via `{children}`
(nested one level deeper, alongside `HomeContent`). Confirmed empirically,
not just reasoned — see §7.

**One cost worth naming plainly:** every case-study page now also ships the
full home page's markup, including all three (large, inline-SVG —
`learn/svg-thumbnail-blur.md`) case-study thumbnails again. That's a real,
measurable page-weight increase on what were previously the lightest pages on
the site. Flagged before the redesign was chosen, flagged again here.

---

## 6. Sidebar becomes route-aware — additively, not by restructuring

`Sidebar.tsx` needed two changes: its identity block becomes a link to `/`
(closing Bug 1), and it needed to stop rendering its own bottom-pill tier on
`/work/` routes (closing Bug 2). The second one is the riskier change — it's
touching a component with a long, carefully-tuned class string covering three
different breakpoint tiers, and a mistake there risks the *already-working*
≥900px sticky sidebar, which has nothing to do with this bug.

Two choices for how to suppress the tier:

- **Restructure**: conditionally build a different class string per tier
  when on a case-study route.
- **Append**: leave every existing class untouched, and *add* an
  `!important`-forced override on top.

Went with append:

```tsx
className={`hidden fixed bottom-10 ... min-[600px]:flex ... min-[900px]:sticky ... ${
    isCaseStudyRoute ? "min-[600px]:!hidden min-[900px]:!flex" : ""
}`}
```

Reasoning: restructuring means figuring out exactly which of ~15 utility
classes are tier-specific-positioning (`bottom-10`, `z-40`, `w-[520px]`,
`slide-in-tablet-pill`, the base `flex`/`hidden`) versus shared-at-every-tier
(`dashed dash-x dash-y bg-surface p-6 shadow-...`, several of which get
*re-overridden* again at ≥900px) — getting that split wrong either breaks the
suppression or breaks the untouched ≥900px sidebar. Appending two classes
can't do either: it can only ever *win* a display-property fight it's
explicitly entered into (`min-[600px]:!hidden`, `min-[900px]:!flex`), and
every other property in that long string is simply never touched. Lower
surface area for a mistake, at the cost of two slightly unusual-looking
`!` classes — a fair trade for a component this easy to regress silently.

`usePathname()` requires `"use client"` — a small, reasonable cost for a
component whose content (from `content.ts`) was already fully static; no
loss of meaningful SSR/SEO value.

---

## 7. The verification detour: three false alarms, three different lessons

Automated verification surfaced three scary-looking failures in a row. None
were real. Worth walking through *why* each one looked like a bug, because
the "why" is more reusable than the specific fix.

**False alarm 1 — "element intercepts pointer events."** Trying to
force-click Sidebar's new identity link while the standalone overlay was
open threw:

```
<div role="dialog" ...> from <div class="... snap-gutter-r">...</div>
subtree intercepts pointer events
```

This looked like the new dialog was broken — actually, it's *correct* modal
behavior. The dialog's backdrop is `fixed inset-0`, covering the whole
viewport by design, specifically so clicking anywhere on the dimmed
background (including visually over the sidebar) closes the modal via its
own handler rather than reaching whatever's rendered underneath. The fix
wasn't to the app; it was to the test — assert the *outcome* of clicking that
screen region (navigates home, via the backdrop's handler), not that a
specific covered element receives the click directly.

**False alarm 2 — Escape/backdrop-click "not navigating home."** Ran right
after editing five files and restarting the dev server; Escape and
backdrop-click both appeared to do nothing on a freshly-visited route.
Re-running the *identical* test against a route that had already been hit
once (i.e., Turbopack had already compiled it) passed cleanly. This is the
same lesson `learn/focus-visible-outline.md` §6 already documented from a
different bug: **Turbopack dev compiles routes lazily, on first request** —
the very first hit to a route can still be mid-compile when a fixed,
short wait elapses, especially once you're also waiting out this
component's own 520ms exit-animation delay on top of that. Warming up each
route with one throwaway visit before the real assertion made every run
consistent.

**False alarm 3 — a `BackNav` click timing out at mobile width.**
`page.locator('a:has-text("Back")').first().click()` hung for the full
timeout. `:has-text()` is a **substring** match — the case-study body copy
apparently contains a word like "feedback" or "rollback" somewhere in its
few thousand characters, so the locator's `.first()` resolved to the entire
(enormous, mostly off-screen) article wrapper instead of the actual `BackNav`
link, and Playwright's actionability check on that giant box never settled.
Switching to `getByRole("link", { name: "Back", exact: true })` — matching
the accessible name exactly, not a substring of arbitrary page text — found
the real element immediately, and the click worked on the first try.

---

## 8. Lessons to carry forward

- **A bug report can bundle a real defect with a design question — separate
  them before fixing.** "The home page disappears" wasn't itself a bug
  (a hard refresh rendering different content than a soft nav is correct,
  documented Next.js behavior); "there's no way back" was. Conflating them
  would have meant either under-fixing (patch navigation, report stays
  unhappy) or over-assuming (redesign the whole page without checking that's
  actually wanted).
- **When a decision has a real cost, show the cost before the user picks.**
  Presenting "small navigation patch" vs. "bigger redesign, more moving
  parts, larger page weight" as concrete previews — before committing to
  either — meant the eventual page-weight tradeoff was a known, chosen cost,
  not a surprise landed on later.
- **A component that already solved a shape ("here's how to be closeable in
  two different ways") is a template for the next component that needs the
  same shape.** `BackNav`'s existing `href`-XOR-`onClick` props became
  `CaseStudyOverlay`'s `closeHref` almost mechanically, once framed that way.
- **When patching a big, delicate, multi-breakpoint class string, prefer
  *appending* a narrowly-scoped `!important` override over restructuring
  it.** Appending can only win the specific property fight it enters;
  restructuring requires correctly re-deriving which classes are tier-local
  vs. shared, and a wrong split silently regresses an unrelated, currently-
  working tier.
- **"Element intercepts pointer events" isn't always a bug — for a modal
  backdrop, it's the point.** Check what the *outcome* of an interaction
  should be before assuming a blocked click is broken.
- **Turbopack dev compiles lazily per route.** A test (or a person) hitting
  a route for the first time in a session can see stale/slow behavior that
  has nothing to do with the code. Warm up, or don't trust the very first
  hit — same lesson as `learn/focus-visible-outline.md` §6, from an
  unrelated bug, which is itself a signal this is worth remembering as a
  house rule, not a one-off.
- **`:has-text()` (and similar substring matchers) can silently match the
  wrong element on any page with real prose on it.** Prefer exact-text or
  role-based queries (`getByRole(..., { exact: true })`) once a page has more
  than a few words of copy anywhere near the element you're targeting.
- **Some bugs can't be fully confirmed without the real device/engine they
  were reported on** (real WebKit couldn't even be reached from this
  sandbox). Ship the best-reasoned, lowest-risk fix, say plainly what wasn't
  verified, and ask for the one check only a human can actually do — don't
  quietly imply more certainty than the evidence supports.

---

## 9. Quick reference

```tsx
// A component that needs "close to a fixed destination" XOR "close via a
// callback", the same shape BackNav already had:
type CloseProps =
    | { href: string; onClick?: undefined }
    | { href?: undefined; onClick: () => void };

// Additive, safe way to override a display property across breakpoints on a
// long, delicate class string — don't restructure it:
className={`${existingLongClassString} ${
    condition ? "min-[600px]:!hidden min-[900px]:!flex" : ""
}`}
```

- Refresh mid-case-study now renders `HomeContent` + `CaseStudyOverlay
  closeHref="/"` together — same look as the soft-nav overlay, closing
  pushes to `/` instead of `router.back()`.
- Sidebar is route-aware (`usePathname().startsWith("/work/")`) and drops its
  own bottom pill there, since `BackNav` fully replaces it.
- Test-verification gotchas hit here, in case they bite again: modal
  backdrops are *supposed* to intercept clicks; warm up a route before
  trusting Turbopack dev's first response to it; `:has-text()` substring-
  matches arbitrary page prose, use exact/role queries instead.
