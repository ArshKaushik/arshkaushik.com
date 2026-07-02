# Case Study Card — Hover Interaction, Explained Line by Line

A deep-dive into how the case-study card's hover animation works, why each line
is written the way it is, and the web concepts underneath. Read top to bottom; it
builds up.

**The effect:** hover a case-study card → the serif **title slides up** and a
**description fades in** beneath it, with a gentle spring "bounce." Move the mouse
away → it reverses. This mirrors the Figma "State=Hovered" variant.

**Files involved:**
| File | Role |
|------|------|
| `src/app/globals.css` | Defines the spring easing token (`--ease-spring-gentle`) |
| `src/components/ui/CaseStudyCard.tsx` | The card markup + the hover classes |
| `src/components/sections/CaseStudies.tsx` | Feeds each card its `title` + `description` |
| `src/lib/content.ts` | The actual text data |

---

## 0. The one mental model you need: how a CSS transition animates

You never write "animation frames" here. The browser does the in-betweening for
you. The recipe is always the same three-part idea:

1. **Two states.** An element has a "resting" style and a "changed" style. Here:
   the title's resting position vs. its position shifted up 42px; the
   description's `opacity: 0` vs `opacity: 1`.
2. **A trigger that swaps between them.** Our trigger is *hover*. In Tailwind,
   `group-hover:` adds the "changed" classes only while the card is hovered, and
   removes them when you leave.
3. **A `transition` that says "don't jump — glide."** Without a `transition`, the
   swap is instant (a snap). `transition` tells the browser: when this property's
   value changes, animate from the old value to the new one over a duration,
   following an easing curve.

> **Key insight:** the *reverse* animation (on mouse-out) is free. Because a
> `transition` watches the property, when hover ends and the value changes back,
> it glides back automatically. You never write the "close" animation.

Everything below is just filling in *which* properties, *how far*, *how long*,
and *with what curve*.

---

## 1. The spring easing token (`globals.css`)

```css
@theme {
  /* ...colors, fonts... */
  --ease-spring-gentle: linear(
    0, 0.0188, 0.0679, 0.1374, 0.2195, 0.308, 0.3978, 0.4856, 0.5686, 0.6452,
    0.7142, 0.7753, 0.8283, 0.8735, 0.9113, 0.9423, 0.9671, 0.9866, 1.0014,
    1.0123, 1.0198, 1.0247, 1.0274, 1.0283, 1.0281, 1.0268, 1.025, 1.0227,
    1.0202, 1.0177, 1.0152, 1.0128, 1.0106, 1.0085, 1.0068, 1.0052, 1.0039,
    1.0028, 1.0018, 1.0011, 1.0005, 1, 0.9997, 0.9995, 0.9993, 0.9992, 0.9992,
    0.9992, 0.9992, 0.9993, 0.9993
  );
}
```

### What an easing curve *is*
An easing function maps **time progress (0→1)** to **animation progress (0→1)**.
"Linear" easing is a straight line: at 50% of the time you're 50% moved. "Ease-out"
starts fast and slows down. The curve is the *personality* of the motion.

### Why this is a "spring," and why it looks like a huge list of numbers
Figma's interaction uses a **spring**, which is physics, not a fixed curve. Picture
a weight on a spring being pulled to a target: `stiffness` = how hard it pulls,
`damping` = friction, `mass` = weight. Figma's "Gentle" preset is
`mass 1 / stiffness 100 / damping 15`. Because damping is *low* relative to
stiffness (under-damped), the weight **overshoots** the target and settles back —
that tiny bounce is the whole "gentle" feel. The `~511ms` duration is *derived*
(how long it takes to settle), not something anyone typed.

### Why `linear(...)` and NOT `cubic-bezier(...)`
- `cubic-bezier()` (what `ease`, `ease-in-out`, etc. are built from) can only draw
  a smooth S-curve **between 0 and 1**. It physically *cannot* go past 1, so it
  **cannot bounce/overshoot**.
- `linear(...)` is a newer easing function that takes a **list of progress
  samples** and connects them with straight segments — so it can trace *any*
  shape, including overshoot. Figma sampled the spring into **51 points** for us.

Look closely at the numbers: they climb past **1.0** (peak `1.0283`), then dip
back and settle near `1`. **That excursion above 1.0 is literally the overshoot.**
When applied to the title's `-42px` move, it means the title glides to ~`-43.2px`
(1.0283 × 42), then eases back to `-42px`. That's the bounce you see.

### Why it lives in `@theme` with an `--ease-` name (the Tailwind v4 trick)
Tailwind v4 reads design tokens from `@theme`. Variables in specific **namespaces**
auto-generate utility classes. The `--ease-*` namespace generates
`transition-timing-function` utilities. So this single line:

```css
--ease-spring-gentle: linear(...);
```

...gives us the class **`ease-spring-gentle`** to use in JSX — no config file
needed. (The built-in `ease-in-out`, `ease-out`, etc. come from the same
namespace.)

> **Gotcha you already hit:** Turbopack does **not** hot-reload `@theme`/`@utility`
> changes. After editing this token you must **restart `pnpm dev`**, or the
> `ease-spring-gentle` class won't be generated and the motion falls back to a
> default ease.

**Browser support for `linear()`:** Chrome 113+, Safari 17.4+, Firefox 112+. Fine
for a modern desktop portfolio.

---

## 2. The card component (`CaseStudyCard.tsx`)

```tsx
export default function CaseStudyCard({
    title,
    description,
    isFirst = false,
}: {
    title: string;
    description: string;
    isFirst?: boolean;
}) {
    return (
        <article
            className={`group flex h-[441px] w-full flex-col items-start gap-6 dashed dash-b bg-surface p-6 ${
                isFirst ? "dash-t" : ""
            }`}
        >
            <div className="h-[296px] w-full bg-surface" />

            <div className="relative flex h-[73px] w-full flex-col items-start justify-end">
                <p className="absolute bottom-0 left-0 w-full font-sans text-[14px] text-textSecondarySurface opacity-0 transition duration-[511ms] ease-spring-gentle group-hover:opacity-100 motion-reduce:transition-none">
                    {description}
                </p>

                <p className="w-full font-serif text-[24px] text-textPrimary transition duration-[511ms] ease-spring-gentle group-hover:-translate-y-[42px] motion-reduce:transition-none">
                    {title}
                </p>
            </div>
        </article>
    );
}
```

### 2a. `group` on the `<article>` — the hover *scope*
```
className={`group flex ...`}
```
`group` is a Tailwind marker (it doesn't style anything by itself). It says: "this
element is a hover *group*." Any descendant can then use **`group-hover:*`** to
react to **the whole card** being hovered — not just itself.

That's exactly what we want: you hover *anywhere* on the card, and the title +
description (deep inside) respond together. Without `group`, a `hover:` on the
title would only fire when you're directly over the title text.

*(The rest of the `<article>` classes — `flex flex-col`, `h-[441px]`, `gap-6`,
`p-6`, `dashed dash-b`, `isFirst ? "dash-t"` — are layout/borders unrelated to the
hover. They were there before.)*

### 2b. The text box — the positioning context
```
<div className="relative flex h-[73px] w-full flex-col items-start justify-end">
```
This box holds the title and description. Three classes matter for the animation:

- **`relative`** — this is the crucial one. It makes this box the **positioning
  context** for the `absolute` description inside it. In CSS, `position: absolute`
  positions an element relative to its nearest *positioned* ancestor. By marking
  the box `relative`, `bottom-0` on the description means "the bottom of *this
  box*," not the bottom of the page.
- **`justify-end`** — this is a flex column, and `justify-end` pushes its content
  to the **bottom**. So the title rests at the bottom of the box (matching the
  Figma default).
- **`h-[73px]`** — a fixed height. The Figma box is sized so that *both* states
  (title only, and title + 2-line description) fit inside the same 73px. The card
  never changes size on hover — only the contents move.

> **Note:** the previous version had `gap-2` here (an 8px flex gap between lines).
> We removed it because the 8px space between the title and description is now
> created by the title's `-42px` offset, not by a flex gap. (More on the 42px
> below.)

### 2c. The description — fades in place (`opacity`)
```
<p className="absolute bottom-0 left-0 w-full
              font-sans text-[14px] text-textSecondarySurface
              opacity-0 transition duration-[511ms] ease-spring-gentle
              group-hover:opacity-100 motion-reduce:transition-none">
  {description}
</p>
```
Class by class:

- **`absolute bottom-0 left-0 w-full`** — takes the description **out of the normal
  document flow** and pins it to the bottom-left of the `relative` box, full width.
  "Out of flow" is important: it means the description occupies **no layout space**,
  so it can sit there invisibly without pushing the title around. In the default
  state it lives *behind/under* the resting title; on hover the rising title
  uncovers it.
- **`font-sans text-[14px] text-textSecondarySurface`** — styling from Figma:
  Geist (sans), 14px, color `#767676`. `text-textSecondarySurface` is a color token
  from `globals.css` (the "secondary text on a white surface" color).
- **`opacity-0`** — the **resting state**: fully transparent (invisible, but
  present in the DOM).
- **`group-hover:opacity-100`** — the **changed state**: when the card (`group`) is
  hovered, opacity becomes 1 (fully visible). This is the value swap from §0.
- **`transition`** — "animate my properties when they change." In Tailwind v4,
  `transition` covers a useful set including `opacity`, `color`, `transform`, and
  `translate`. Without it, opacity would jump 0→1 instantly.
- **`duration-[511ms]`** — the fade takes 511ms (the spring's settle time).
- **`ease-spring-gentle`** — the curve from §1. (On opacity the overshoot above 1.0
  is invisible — opacity just clamps at 1 — but the *timing* of the fade still
  follows the spring, so it feels consistent with the title's motion.)
- **`motion-reduce:transition-none`** — accessibility. If the user's OS is set to
  "Reduce motion," we turn the transition **off**: the description still
  appears/disappears on hover, it just doesn't animate. (See §4.)

**Why is the description listed *before* the title in the JSX?** Because it's
`absolute`, its DOM order doesn't affect layout — but it *does* affect paint order.
Later elements paint on top. Putting the description first means the **title paints
on top of it** while sliding away, which looks cleaner during the overlap.

### 2d. The title — slides up (`translate`)
```
<p className="w-full font-serif text-[24px] text-textPrimary
              transition duration-[511ms] ease-spring-gentle
              group-hover:-translate-y-[42px] motion-reduce:transition-none">
  {title}
</p>
```
- **`w-full font-serif text-[24px] text-textPrimary`** — Figma styling (Instrument
  Serif, 24px, black). Unchanged from before.
- **`group-hover:-translate-y-[42px]`** — the **changed state**: when the card is
  hovered, move the title up 42px on the Y axis. `-translate-y` = negative Y =
  upward. `[42px]` is Tailwind "arbitrary value" syntax for an exact pixel value
  Figma gave us. At rest (no hover) there's no translate class, so the title sits
  at its natural bottom-aligned position.
- **`transition duration-[511ms] ease-spring-gentle`** — same trio as the
  description, so the title and description move in perfect sync. Here the spring's
  overshoot *is* visible: the title nudges slightly past -42px and settles back.
- **`motion-reduce:transition-none`** — same accessibility fallback.

**Why 42px, and why is it a "magic number"?** The title moves up exactly far
enough to clear the 2-line description (≈34px) plus the 8px gap = 42px. This value
is **tuned for ~2-line descriptions** (all three current blurbs are ~2 lines at the
card's width). If a future description were 1 or 3 lines, the alignment would
drift and you'd re-tune the 42px. (A fully length-agnostic version would animate
the description's *height* instead — see §5 for why we didn't.)

### 2e. Why transform + opacity, and not "height"?
We move the title with a **transform** (`translate`) and reveal the description
with **opacity**. Neither changes the element's box in the layout. That matters:

- **Transforms and opacity are cheap** — the browser can animate them on the GPU
  as a "compositing" step, without recalculating page layout every frame. Smooth.
- **Animating layout (like `height` or `top`) is expensive** — it forces the
  browser to re-lay-out the page on every frame ("reflow"), which can stutter.
- **The spring overshoot renders cleanly on a transform** (the title just travels a
  hair past its target). On a `height` animation, an overshoot would look janky
  (the box would visibly overshoot its content size and snap back).

This is a general rule worth remembering: **prefer animating `transform` and
`opacity`.**

---

## 3. Wiring the data (`CaseStudies.tsx` + `content.ts`)

The card is presentation-only. The section feeds it data:

```tsx
// CaseStudies.tsx
{caseStudies.map((study, index) => (
    <CaseStudyCard
        key={study.title}
        title={study.title}
        description={study.description}   // ← added: the text that fades in
        isFirst={index === 0}
    />
))}
```

```ts
// content.ts — the source of truth for the copy
export const caseStudies: { title: string; description: string }[] = [
    { title: "...", description: "..." },
    // ...
];
```

So the flow is: `content.ts` (data) → `CaseStudies.tsx` (loops, passes props) →
`CaseStudyCard.tsx` (renders + animates). Changing the copy is a `content.ts` edit;
the animation logic never changes.

---

## 4. Accessibility notes

- **`motion-reduce:transition-none`** honors the OS "Reduce motion" setting (macOS:
  *System Settings → Accessibility → Display → Reduce motion*). Users who get
  motion-sick still get the information (the description shows), just without the
  slide/fade. This maps to the CSS media query `@media (prefers-reduced-motion:
  reduce)`.
- **Known limitation:** this reveal is **hover-only**, so it's not reachable by
  keyboard or touch. The card is currently a non-interactive `<article>`, and the
  site is desktop-only for now, so that's acceptable. **When the card becomes a
  link** later, mirror the hover with focus by also adding
  `group-focus-within:-translate-y-[42px]` and `group-focus-within:opacity-100`.

---

## 5. How the Tailwind classes become real CSS (peek under the hood)

Tailwind utilities are shorthands. Here's what a few compile to (you can verify
this yourself in DevTools → Elements → Computed, or by grepping the built CSS in
`.next/`):

| Tailwind class | Generated CSS (roughly) |
|----------------|--------------------------|
| `group-hover:-translate-y-[42px]` | `.group:hover .. { --tw-translate-y: calc(42px * -1); translate: var(--tw-translate-x) var(--tw-translate-y); }` |
| `group-hover:opacity-100` | `.group:hover .. { opacity: 1; }` |
| `duration-[511ms]` | `transition-duration: 511ms;` |
| `ease-spring-gentle` | `transition-timing-function: linear(0, .0188, … .9993);` |
| `transition` | `transition-property: color, …, opacity, transform, translate, …; transition-timing-function: <default>; transition-duration: <default>;` |

Note Tailwind v4 uses the individual **`translate`** CSS property (not the older
`transform: translateY(...)`), via a `--tw-translate-y` variable. That's why the
value shows up as `calc(42px * -1)`.

### The "content-agnostic" alternative we deliberately skipped
Instead of a fixed `-42px` transform, you *could* make the description's container
grow from height 0 to its natural height with the CSS grid trick
(`grid-template-rows: 0fr → 1fr`) and let normal flow push the title up by exactly
the description's real height. Pros: works for any description length. Cons: it
animates *layout* (less smooth) and a spring overshoot on height looks janky. Since
Figma specifies a fixed transform and our copy is uniform, we matched Figma. Good
to know the trade-off exists.

---

## 6. Try it yourself (to build intuition)

Small experiments, each isolates one concept:

1. **Kill the curve:** change `ease-spring-gentle` → `ease-linear` on both `<p>`s.
   The bounce disappears; motion feels robotic. (Shows what the spring adds.)
2. **Kill the timing:** remove `transition` from the title. Now it *snaps* up
   instantly on hover. (Shows that `transition` is what makes it glide.)
3. **Exaggerate the overshoot:** temporarily change the move to
   `group-hover:-translate-y-[80px]` — you'll clearly see it fly past and settle.
4. **Change the feel:** try `duration-[300ms]` (snappier) vs `duration-[900ms]`
   (languid). Same curve, different tempo.
5. **Break the scope:** change `group-hover:` → `hover:` on the title. Now the
   title only moves when you're directly over the *text*, not the whole card.
   (Shows what `group` buys you.)

Remember to **restart `pnpm dev`** only when you touch `globals.css` (`@theme`);
`.tsx` class changes hot-reload fine.

---

## TL;DR

- A CSS **transition** = "two states + a trigger + glide between them." The reverse
  is automatic.
- **`group`** on the card + **`group-hover:`** on children = whole-card hover scope.
- **Title** animates a `translate` (up 42px); **description** animates `opacity`
  (0→1). Both use `transition duration-[511ms] ease-spring-gentle`.
- The **spring** feel needs `linear(...)` (it can overshoot past 1.0);
  `cubic-bezier` can't. Tailwind v4's `--ease-*` token auto-makes the class.
- Prefer animating **transform + opacity** (GPU-cheap) over layout (`height`).
- Restart the dev server after `@theme` edits.
