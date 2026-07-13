# Dashed Borders — Deep Dive

A complete walkthrough of how the dashed hairlines in this project work, line by
line, plus the story of two subtle bugs that hid in this code: one about CSS
variable **inheritance** (§5), one about `background-position` percentages
computed from an element's own **rendered size**, exposed only at unusual
browser zoom levels (§6).

All the code lives in **`src/app/globals.css`** (the `Custom dashed hairlines`
section) and is used in `page.tsx`, `Hero.tsx`, `Stat.tsx`, and `CaseStudyCard.tsx`.

---

## 1. The goal and the constraint

The Figma design uses dashed dividers with an exact rhythm: **10px dash, 10px
gap, 1px thick, colour `#d8d8d8`**.

The obvious tool is a CSS dashed border (`border: 1px dashed`, i.e. Tailwind's
`border-dashed`). **It cannot do this.** `border-style: dashed` hands the dash
and gap lengths to the *browser* — the spec gives you no property to set them.
Every browser picks its own (usually short) dashes. So a real border is out.

**Key idea:** if we can't control a *border*, we'll *paint the line ourselves*
as a background image, where we control everything.

---

## 2. Painting a line with a gradient

A CSS gradient is just an image. We can make an image that looks like one dash:

```css
linear-gradient(to right, var(--color-stroke) 50%, transparent 50%)
```

Read it left→right: from `0%` to `50%` it's the stroke colour; from `50%` to
`100%` it's transparent. The two stops sit at the **same** point (`50%`), so
there's a **hard edge** — no fade. That gives us a tile that is "half solid,
half empty."

Now we control the size and tiling with three background properties:

```css
background-size: 20px 1px;   /* the tile is 20px long, 1px thick        */
background-repeat: repeat-x; /* tile it left→right along the edge       */
background-position: top;    /* park it on the top edge                 */
```

`20px` tile × `50%` solid = **10px dash**, and the other half = **10px gap**.
Repeat it and you get a perfect 10 / 10 dashed line. For a *vertical* line we
just rotate the idea: `to bottom`, `background-size: 1px 20px`, `repeat-y`.

> **Why a fixed 20px tile instead of `repeating-linear-gradient(...)` stretched
> across the whole edge?** A tiny fixed tile rasterises crisply on the GPU. A
> repeating gradient computed across a long edge can blur its gaps in some
> browsers. The fixed tile is the more robust choice — this project used the
> repeating version first and switched to the tile for exactly this reason.

---

## 3. Making it composable: a base + edge "markers"

We don't want to hand-write those background rules on every element. Instead we
build a small system: **one base utility that can draw up to four edges, plus
tiny "marker" utilities that switch individual edges on.** They compose like
Tailwind's own `border-t` / `border-x`.

### 3a. The shared tiles

```css
:root {
  --dash-h: linear-gradient(to right,  var(--color-stroke) 50%, transparent 50%);
  --dash-v: linear-gradient(to bottom, var(--color-stroke) 50%, transparent 50%);
}
```

- `--dash-h` = the **horizontal** line tile (for top/bottom edges).
- `--dash-v` = the **vertical** line tile (for left/right edges).

They're defined once and reused, so the dash colour/shape lives in a single place.

### 3b. The base utility

```css
@utility dashed {
  background-image:    var(--dash-t, none), var(--dash-b, none), var(--dash-l, none), var(--dash-r, none);
  background-position: top,                 bottom,              left,                right;
  background-size:     20px 1px,            20px 1px,            1px 20px,            1px 20px;
  background-repeat:   repeat-x,            repeat-x,            repeat-y,            repeat-y;
}
```

This is the heart of it. A background can hold **multiple stacked layers**,
separated by commas, and the four properties above line up **by position**:

| Layer | image | position | size | repeat | = which edge |
|------:|-------|----------|------|--------|--------------|
| 1 | `var(--dash-t, none)` | `top`    | `20px 1px` | `repeat-x` | **top** |
| 2 | `var(--dash-b, none)` | `bottom` | `20px 1px` | `repeat-x` | **bottom** |
| 3 | `var(--dash-l, none)` | `left`   | `1px 20px` | `repeat-y` | **left** |
| 4 | `var(--dash-r, none)` | `right`  | `1px 20px` | `repeat-y` | **right** |

The clever bit is `var(--dash-t, none)`: each layer's image comes from a
variable, and if that variable **isn't set**, it falls back to `none` — an empty
layer that draws nothing. So the base *always* declares four layers, but a layer
is only visible if something set its variable. That "something" is a marker.

### 3c. The markers

```css
@utility dash-t { --dash-t: var(--dash-h); } /* top    */
@utility dash-b { --dash-b: var(--dash-h); } /* bottom */
@utility dash-l { --dash-l: var(--dash-v); } /* left   */
@utility dash-r { --dash-r: var(--dash-v); } /* right  */
@utility dash-x { --dash-l: var(--dash-v); --dash-r: var(--dash-v); } /* left + right */
@utility dash-y { --dash-t: var(--dash-h); --dash-b: var(--dash-h); } /* top + bottom */
```

Each marker does one job: set its edge's variable to the right tile. Because
they only flip variables (which the base reads), **they stack**:

```html
<div class="dashed dash-t dash-b">   <!-- top + bottom -->
<div class="dashed dash-x">          <!-- left + right (shortcut) -->
```

`dash-x` / `dash-y` are convenience markers that set two edges at once, mirroring
Tailwind's `border-x` / `border-y`.

### 3d. Where each is used

| Element | classes | draws |
|---|---|---|
| `main` (the 600px column) — `page.tsx` | `dash-x-edge-safe` (see §6 — *not* the plain `dashed dash-x` combo) | left + right rails |
| tagline box — `Hero.tsx` | `dashed dash-t` | top |
| stats row — `Hero.tsx` | `dashed dash-y` | top + bottom |
| stat cells 2 & 3 — via `Hero.tsx` | `dashed dash-l` | left divider |
| case-study card — `CaseStudyCard.tsx` | `dashed dash-b` (+ `dash-t` on the first via the `isFirst` prop) | bottom (first card also top) |

---

## 4. A separate fix: pixel-snapped centering

```css
@utility snap-center-x {
  margin-left: round(calc((100% - 600px) / 2), 1px);
}
```

Used on `main`. This solves a *different* 1px-line problem. The column is
centred beside the sidebar, so its left margin is `(available − 600) / 2`. On an
**odd** window width that's a **half-pixel** (e.g. `420.5px`). A 1px vertical
line sitting on a half-pixel straddles two device pixels and renders soft/thick.

`round(…, 1px)` is CSS doing math at layout time: it rounds the centring margin
to a whole pixel, so the column's left edge — and every vertical line inside it —
always lands on an integer pixel and stays sharp. (`100%` here resolves against
the column's containing block, the area beside the sidebar.)

> This is worth separating in your head from the bug below. Snapping addresses
> *sub-pixel position*. The bug below was about *extra lines being drawn at all*.

---

## 5. The bug that hid for a long time: variable **inheritance**

This system had a serious flaw baked in from the moment it was built. It caused
the stats' vertical lines to look thick / near-solid, and — the tell that cracked
it — made **one stat's divider look correct while the next one didn't.**

### 5a. What actually went wrong

**CSS custom properties inherit by default.** That's the whole bug in one
sentence.

`main` has `dash-x`, which sets `--dash-l` and `--dash-r` **on `main`**. Because
those variables inherit, *every descendant of `main`* — the tagline, the stats
row, each stat cell, the cards — silently received `--dash-l` and `--dash-r` too.

And any descendant that also had the `dashed` base read those inherited values.
Remember layer 3 is `var(--dash-l, none)` — the `none` fallback only kicks in
when `--dash-l` is **unset**. But it wasn't unset anymore; it was *inherited*. So
those elements drew **extra left/right lines they were never asked to draw.**

It cascaded further: the stats row's own `dash-y` set `--dash-t`/`--dash-b`,
which then inherited into the **stat cells** — so each stat cell ended up drawing
**all four edges** instead of just its one left divider.

A probe of the live DOM made it undeniable (`1` = that edge is being drawn):

```
                 t  b  l  r
main             -  -  1  1     ← correct: only its own left/right rails
statsRow         1  1  1  1     ← BUG: l,r inherited from main (should be t,b)
stat2            1  1  1  1     ← BUG: should be just l — drawing all four!
stat3            1  1  1  1     ← same
```

### 5b. Why that produced *exactly* the symptoms seen

- **stat2's left divider looked correct.** Its left edge (x≈660) had only its own
  line — the cell to its left (`stat1`) has no `dashed` base, so nothing else drew
  there.
- **stat3's left divider looked wrong/thick.** Its left edge (x≈852) is also
  stat2's **right** edge — and stat2 was drawing an (inherited) right line there.
  Two lines on the same pixel → doubled → thick.
- **The stats block's left/right sides looked near-solid.** Those are `main`'s
  rails, but the stats row was *also* drawing its own inherited left/right lines
  on top of them — at a **different dash phase** (different element height), so the
  two dashed lines filled each other's gaps and read as a solid line.

### 5c. Why it was so hard to detect and fix

This is the interesting part — several things conspired to hide it:

1. **The geometry was perfect.** Every element's measured position was a clean
   integer (`stat2 left = 660`, `stat3 left = 852`, …). Debugging that measured
   *positions* — including the pixel-snap fix in §4 — found nothing wrong, because
   nothing *was* wrong about positions. The bug was in the **number of layers
   being painted**, which position data never reveals.

2. **Screenshots looked fine.** Automated screenshots were taken with a
   *software* renderer at an exact integer scale. Two doubled lines that happen to
   align look like one 1px line there, and the near-solid effect needs a real
   display (GPU rasterisation + a phase mismatch) to jump out. So the captures
   kept saying "crisp" while the real browser said otherwise.

3. **The symptom impersonated a completely different problem.** Soft/thick 1px
   vertical lines, worse in some spots, showing up in *every* browser (Safari and
   Arc alike) is the textbook fingerprint of a **sub-pixel / display-scaling**
   issue. That was a very convincing wrong hypothesis — it even led to a confident
   (and incorrect) "it's your macOS scaled resolution" conclusion. A good-looking
   wrong theory is the most expensive kind, because it stops you looking further.

4. **It was invisible in the source.** Nothing in `Hero.tsx` or `Stat.tsx` says
   "draw a right border on stat2." The extra lines came from *inheritance*, a
   mechanism acting behind the JSX. You can read every component file and never
   see it.

5. **It was there from day one of this design.** The composable variable system
   worked correctly *until* something up the tree (`main`'s `dash-x`) set an edge
   variable that a descendant didn't override. Before the rails existed the
   inheritance had nothing to leak, so the design looked sound.

**What finally found it:** stop trusting screenshots and positions, and probe the
*computed* result — dump each element's `getComputedStyle().backgroundImage` and
check which `--dash-*` variables were set on it. That's when `stat2`/`stat3`
showing all four edges gave it away. (Credit where due: the "is something drawn
twice?" hypothesis pointed straight at this.)

### 5d. The fix

Register the four edge variables as **non-inheriting**:

```css
@property --dash-t { syntax: "*"; inherits: false; }
@property --dash-b { syntax: "*"; inherits: false; }
@property --dash-l { syntax: "*"; inherits: false; }
@property --dash-r { syntax: "*"; inherits: false; }
```

`@property` lets you *register* a custom property and declare how it behaves.
`inherits: false` means a child does **not** pick up an ancestor's value. Now:

- `main` sets `--dash-l`/`--dash-r` → only `main` draws rails.
- The stats row, stat cells, tagline, cards don't inherit those anymore, so for
  them `var(--dash-l, none)` correctly falls back to **`none`** — each element
  draws *only* the edges its own markers set.

Note we register only the four **per-edge** variables. `--dash-h` / `--dash-v`
(the shared tiles) are left as normal *inheriting* variables on purpose — they're
meant to be readable everywhere.

The same probe after the fix:

```
                 t  b  l  r
main             -  -  1  1     ← rails only
statsRow         1  1  -  -     ← top/bottom only  ✅ leak gone
stat2            -  -  1  -     ← left only        ✅
stat3            -  -  1  -     ← left only        ✅
```

`syntax: "*"` just means "accept any value" (we're storing a gradient or nothing,
not a typed length/colour). `@property` is supported in Chrome/Arc 85+,
Safari 16.4+, Firefox 128+.

---

## 6. A second bug: the right rail vanishing at unusual browser zoom

Reported symptom, on `main`'s rails specifically (`page.tsx`, the only element
using left+right dashes at the time): **at 33% browser zoom, the left rail was
visible but the right rail was completely gone.** Not thin, not faint — gone.

### 6a. Why this isn't the same bug as §5

The inheritance bug (§5) *added* extra lines — the symptom was doubling/thickening.
This symptom is the opposite: a line that should exist simply doesn't render.
That shape of symptom (present vs. absent, not thin vs. thick) points at
something being **positioned outside the visible area and clipped**, not at an
extra layer being painted.

### 6b. The actual mechanism

Look at the base utility's `background-position` again:

```css
background-position: top, bottom, left, right;
```

The browser resolves these keywords to explicit percentages. Checking the real
computed style confirms it:

```
background-position: 50% 0%, 50% 100%, 0px 50%, 100% 50%;
                      ↑top   ↑bottom   ↑left     ↑right
```

`left` resolves to a literal `0px` — a constant, never computed from anything.
`right` resolves to `100%`, which for a 1px-wide tile the browser computes as
`(element's rendered width) − 1px`. That's not a constant — it's **derived from
a measurement of the box itself.**

At 100% browser zoom, 1 CSS pixel maps cleanly to 1 device pixel, so that
derived value lands on a whole device pixel and renders exactly like the
constant-anchored left edge. At an unusual zoom level like 33%, the CSS-pixel-
to-device-pixel ratio becomes fractional, and a value computed from a
measurement (not typed as a literal) is far more exposed to landing on a
sub-pixel offset than a hardcoded `0` ever is.

And `main` has `overflow-clip`. That's the piece that turns "lands on a
sub-pixel offset" into "disappears entirely" rather than "looks slightly soft."
`overflow-clip` doesn't fade a pixel that falls fractionally outside the box —
it removes it, all or nothing. So: the right rail's position can drift outside
the clipped box under fractional zoom; the left rail's position, being a
constant `0`, structurally cannot. Same tile, same zoom, same 1px size — the
*position calculation* is what differs, and only one of the two is exposed to
drift at all.

The same logic applies to `dash-b` (`bottom`, resolved to `50% 100%` — the
vertical component is *also* height-derived) — it just hadn't been reported
broken for anything using `dash-y`, since nothing prompted zooming out on those
elements specifically.

### 6c. Why this one couldn't be verified with an automated repro

Unlike §5 (found by dumping computed styles from a live DOM), this bug couldn't
be reproduced with browser automation at all. Browser *zoom* (Ctrl/Cmd + −) is
a browser-chrome feature, not a page-level DOM event — Playwright's
`page.keyboard.press('Control+-')` sends the keypress into the page, but the
zoom level itself lives outside anything a webpage (or a page-level automation
API) can observe or trigger. Confirmed directly: firing that shortcut 8 times in
a row left `window.innerWidth` completely unchanged. Approximating zoom by
just enlarging the viewport doesn't reproduce it either — that keeps a clean
1:1 CSS-pixel-to-device-pixel ratio, so nothing ever lands on a sub-pixel
offset; the whole bug depends on that ratio becoming fractional, not on the
box merely getting bigger.

So this fix was implemented from the CSS reasoning above, verified to cause **no
regression at normal zoom** (both rails still render, byte-identical position),
but not verified against the exact reported symptom — that needed a human
actually zooming a real browser to 33% and looking.

### 6d. The fix

A new, self-contained utility, used only where the bug was reported:

```css
@utility dash-x-edge-safe {
  background-image: var(--dash-v), var(--dash-v);
  background-position: left 1px top 50%, right 1px top 50%;
  background-size: 1px 20px, 1px 20px;
  background-repeat: repeat-y, repeat-y;
}
```

Both edges get an explicit **1px inset from the true edge** — not just the
right one, even though only the right one is actually at risk, to keep the two
rails visually symmetric rather than one flush and one not. 1px of slack is
enough to absorb sub-pixel rounding drift (which is by definition less than a
full pixel) without ever landing outside the clipped box.

Note what this *doesn't* do: it doesn't touch `dashed`, `dash-x`, or `dash-r`.
Every other dashed border on the site — Hero's tagline/stats, the case-study
cards — still uses the original, unmodified utilities and shares the same
theoretical exposure to this bug. It just wasn't the thing that was reported,
and folding a 1px inset into utilities used in a dozen places is a much bigger
visual-risk decision than making it for one specific element. If this turns out
to matter elsewhere, that's a deliberate, separate call to make later — not
something to sneak in as a side effect of fixing `main`.

---

## 7. Lessons to carry forward

- **CSS custom properties inherit by default.** If you use them as *element-local
  flags* (like these per-edge toggles), that's a trap waiting to spring the moment
  an ancestor sets the same variable. Reach for `@property { inherits: false }` to
  scope them.
- **Debug the dimension that matches your hypothesis.** Measuring *positions* when
  the bug is in *layer count* will "confirm" everything is fine. Ask what the
  symptom actually implies and probe *that*.
- **A convincing wrong theory is costly.** "It's display scaling" fit the visible
  symptoms and wasted the most time. Reproduce and measure the real computed
  output before committing to a cause.
- **`background`, not `border`, when you need pixel-exact dashes** — and prefer a
  small fixed *tile* (`background-size` + `repeat`) over a stretched
  `repeating-linear-gradient`.
- **A position computed from the element's own size is not the same as a
  constant position**, even when both currently evaluate to "the same place."
  One can drift under conditions (zoom, sub-pixel layouts) the other structurally
  can't. When a hairline needs to survive an edge case, ask which of its
  coordinates are measured vs. hardcoded.
- **Not every bug can be automated-reproduced before fixing it.** Browser zoom
  is real, common, and entirely outside what page-level automation can see or
  drive. Say so plainly, verify what *can* be verified (no regression at normal
  zoom), and ask a human to confirm the rest — that's more honest than silently
  claiming a fix "works" when only half of it was actually checked.

---

## 8. Quick reference

```css
/* turn dashes on, then pick edges (they stack) */
class="dashed dash-t"          /* top */
class="dashed dash-y"          /* top + bottom */
class="dashed dash-x"          /* left + right */
class="dashed dash-b first?"   /* bottom, + dash-t on the first item */
class="dash-x-edge-safe"       /* left + right, 1px zoom-safe inset (main only, §6) */
```

- Tile = `linear-gradient(dir, stroke 50%, transparent 50%)` sized to `20px`
  → 10px dash / 10px gap.
- Base `dashed` = four background layers fed by `--dash-t/-b/-l/-r`.
- Markers set those vars; `@property … inherits:false` keeps them from leaking.
- `snap-center-x` keeps the centred column on whole pixels (separate 1px concern).
- `dash-x-edge-safe` insets both vertical rails 1px so the width-derived right
  edge can't round outside `main`'s `overflow-clip` boundary at odd browser
  zoom levels (§6) — self-contained, doesn't affect `dashed`/`dash-x`/`dash-r`
  used elsewhere.
