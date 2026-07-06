# The Blue Outline After Closing the Overlay — `:focus-visible`, Explained

The story of a small, sneaky bug: open a case study, press **Esc**, and a **blue
outline** is left behind on the card you clicked. Click *outside* the overlay to
close it instead and there's **no outline**. Same close, two different results.

This doc explains the concept behind it (`:focus`, `:focus-visible`, and "focus
modality"), why the symptom was asymmetric, why my first attempts to *reproduce*
it failed, and the one-line-idea fix — which turned out to also be the *correct*
accessibility behaviour I was missing.

The fix lives in **`src/components/case-study/CaseStudyOverlay.tsx`**. The card
that got the stray outline is the `<Link>` in
**`src/components/ui/CaseStudyCard.tsx`**.

---

## 0. The one mental model you need: focus vs. the focus *ring*

Two different things that are easy to conflate:

- **Focus** — which single element currently receives keyboard input. There is
  always exactly one (it defaults to `<body>`). You can read it live as
  `document.activeElement`. Clicking an interactive element, tabbing to it, or
  calling `el.focus()` all move focus.

- **The focus *ring*** — the visible outline the browser draws *around* the
  focused element so keyboard users can see where they are. This is a separate
  decision from "is it focused." An element can be focused with **no** ring.

CSS exposes both as pseudo-classes:

| Selector | Matches when… |
|---|---|
| `:focus` | the element is focused — **always**, however focus got there |
| `:focus-visible` | the element is focused **and the browser thinks a ring should show** |

Modern browsers style the ring through `:focus-visible`, not `:focus`, precisely
so a **mouse** click doesn't leave a ring but a **keyboard** interaction does.

### "Focus modality" — the hidden state that decides the ring

How does the browser decide whether a ring "should show"? It tracks your **last
input modality** — roughly, *"was the most recent interaction keyboard or
pointer?"* — and applies a heuristic:

- Last interaction was **keyboard** (Tab, arrows, **Esc**, typing) → focused
  elements match `:focus-visible` → **ring shows**.
- Last interaction was **mouse/touch** → focused elements usually **don't** match
  `:focus-visible` → **no ring**.

This modality is a global, invisible flag inside the browser. You never set it
directly; it flips based on how you interact. **Remember this — it's the whole
bug.**

---

## 1. The symptom

1. Click a "Selected work" card → the case-study overlay slides up. (URL becomes
   `/work/<slug>`; the home page stays mounted *behind* the overlay — see the
   intercepting/parallel-route setup.)
2. Press **Esc** → the overlay closes… and a **blue rectangle outline** is drawn
   around the card you had clicked.
3. Do the same but close by **clicking the dimmed backdrop** instead → the
   overlay closes with **no** outline.

The outline was the browser's default focus ring. Probing the focused element's
computed style pinned down exactly what it was:

```
outline-style: auto
outline-color: rgb(0, 95, 204)   ← Chrome's default focus blue
```

(You saw it as a "line at the top of the card," but `outline: auto` actually
wraps all four sides — the top edge is just what catches the eye.)

---

## 2. Why Esc and backdrop-click behaved differently

Here's the chain of events, and it's all about §0's modality flag.

**Opening:** clicking a card focuses its `<a>` (a real mouse click focuses the
link). The overlay is a *separate* route slot that renders **on top of** the
still-mounted home page — it never touches focus. So the whole time the overlay
is open, **the card behind it is still the focused element.** But it was focused
by a *mouse*, so no ring shows yet.

**Closing with Esc (keyboard):**
- Esc is a **keyboard** action → the modality flag flips to *keyboard*.
- The card `<a>` is *still focused* (nothing moved focus).
- A focused element under keyboard modality now matches **`:focus-visible`** →
  the browser paints the ring on the card. 🔵

**Closing with a backdrop click (mouse):**
- Clicking the backdrop (a non-focusable `<div>`) moves focus to `<body>`, and
  the modality flag is *mouse*.
- The card is no longer focused, and mouse modality wouldn't show a ring anyway
  → nothing. ✅

A live probe of the two paths made it concrete (`activeElement` = what's focused
*after* the close):

| Close path | `activeElement` after | card `:focus-visible` | ring? |
|---|---|---|---|
| **Esc** (keyboard) | the card `<a>` | `true` | 🔵 yes |
| **Backdrop click** (mouse) | `<body>` | `false` | no |

Same close logic (`router.back()`), opposite outcome — purely because of *how*
each was triggered.

---

## 3. The detour worth learning from: my reproduction *lied*

Before fixing, I tried to reproduce the bug from a script so I could verify the
fix automatically. My first attempt did this:

```js
// open, then "press Escape"
document.querySelector('a[href^="/work/"]').click();
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
```

**It didn't reproduce.** The probe said `activeElement` was `<body>` in *both*
the Esc and click paths, and the ring never appeared. For a while that was
baffling — the real browser clearly showed the bug.

Two subtle reasons synthetic events couldn't reproduce it:

1. **`element.click()` does not move focus.** It fires a `click` *event*, but a
   *real* mouse press is what focuses a link. So in the script the card was never
   focused → nothing to leave a ring on.
2. **A synthetic `KeyboardEvent` does not flip the modality flag.** That flag is
   set by the browser's *real* input pipeline, not by JS-dispatched events. So
   even a focused element wouldn't switch to `:focus-visible`.

In short: **synthetic DOM events simulate the event, not the interaction.** Focus
side-effects and the keyboard/mouse modality are properties of *genuine* input.

The fix for the *test* was to drive **real** input through the Chrome DevTools
Protocol's `Input` domain (`Input.dispatchMouseEvent` /
`Input.dispatchKeyEvent`), which go through the real pipeline — they focus the
link on click and they set modality. With real events, the bug reproduced
immediately (`card :focus-visible = true`), and after the fix it was gone. This
distinction (synthetic vs. real events) is the most reusable lesson here.

---

## 4. The fix: move focus *into* the dialog on open

The bug exists because the **card keeps focus** while the overlay is open. So
take focus *off* the card and put it *in* the overlay — which is exactly what a
well-behaved modal is supposed to do anyway.

```tsx
// CaseStudyOverlay.tsx
const dialogRef = useRef<HTMLDivElement>(null);

// Move focus INTO the dialog on open. Pulls focus off the card that was
// clicked, so closing (either way) just drops focus to <body> — no stray ring.
useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
}, []);
```

and on the backdrop element:

```tsx
<div
    ref={dialogRef}
    role="dialog"
    aria-modal="true"
    aria-label={study.title}
    tabIndex={-1}          {/* makes a <div> programmatically focusable */}
    onClick={close}
    className="... outline-none ..."   {/* don't draw a ring on the dialog itself */}
>
```

### Why each piece is there

- **`tabIndex={-1}`** — a plain `<div>` isn't focusable by default, so
  `dialogRef.current.focus()` would do nothing. `-1` means *"focusable by script,
  but skipped by Tab"* (we don't want Tab to land on the container).
- **`focus({ preventScroll: true })`** — focusing an element can scroll it into
  view; `preventScroll` says "just move focus, don't scroll." Safe here since the
  dialog already fills the viewport.
- **`outline-none`** — the moment we call `.focus()` on the dialog *during* an Esc
  press (keyboard modality), the dialog itself could flash a `:focus-visible`
  ring. It's a full-screen container, not a control, so we suppress its ring.

### Why this actually removes the card's ring

When the overlay closes, React unmounts it. **When the focused element is removed
from the DOM, focus falls back to `<body>`.** Because focus now lives on the
dialog (not the card), closing — by Esc *or* click — always lands focus on
`<body>`. The card is never the focused element at close time, so it can never
match `:focus-visible`, so **no ring.**

The same probe as §2, after the fix:

| Close path | `activeElement` after | card `:focus-visible` | ring? |
|---|---|---|---|
| **Esc** | `<body>` | `false` | ✅ none |
| **Backdrop click** | `<body>` | `false` | ✅ none |

---

## 5. Why not just `outline: none` on the card?

That's the tempting one-liner — and it's the **wrong** fix. The focus ring isn't
noise; it's how a **keyboard user** sees where they are. Deleting it makes the
site unusable for anyone navigating by Tab, and it fails
[WCAG 2.4.7 (Focus Visible)](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html).

The real problem was never "the ring exists," it was **"focus was in the wrong
place."** Moving focus into the modal fixes the *cause*: the ring machinery stays
fully intact for genuine keyboard navigation, and as a bonus we get the correct
modal behaviour we were missing —

- keyboard and screen-reader users are placed *inside* the dialog (which
  announces its `aria-label`) instead of continuing to tab through the home page
  hidden behind the overlay.

> Nuance: for a true keyboard user, seeing a ring when focus returns to the
> trigger on close is actually *correct*. We let focus fall to `<body>` here
> because it removes the stray ring cleanly and this is a small, mouse-first
> portfolio. A stricter modal would *remember the trigger and restore focus to
> it* on close — the more accessible pattern, at the cost of the ring reappearing
> for keyboard closers.

---

## 6. A verification scare (and why the first run lied — again)

Right after the fix, an automated check reported that **backdrop-click had
stopped closing** the overlay. Mild panic — did moving focus break the click
handler?

I chased it with a millisecond-by-millisecond timeline (sample the dialog's
opacity and the card's transform at +150ms, +650ms, +1250ms after the click).
The timeline clearly showed it *was* closing: at +150ms the dialog was already
fading and the card sliding away; by +650ms it was fully gone. Re-running the
original check twice more: both passed.

The culprit was **Turbopack HMR**. That failing check was the *very first* page
load after I saved the edit, so it hit a module mid-recompile. It was never a
real regression.

Lesson: **don't trust the first test run immediately after a hot edit** — give
the dev server a beat, and prefer a second, clean run before believing a scary
result.

---

## 7. Lessons to carry forward

- **`:focus` ≠ the focus ring.** Style rings via `:focus-visible`, and know the
  browser gates it on a hidden **keyboard-vs-mouse modality** flag. Most
  "why did an outline appear only sometimes?" puzzles are this.
- **A modal must own focus.** Move focus *into* it on open (and ideally restore on
  close). It fixes stray-ring bugs *and* is the accessible thing to do.
- **Never reach for `outline: none` to hide a ring.** Fix *where focus is*, not
  *whether it's visible*.
- **Synthetic events simulate the event, not the interaction.** `.click()`
  doesn't focus; a JS `KeyboardEvent` doesn't set modality. To test
  focus/hover/`:focus-visible` behaviour, drive **real** input (e.g. CDP's
  `Input` domain), not `dispatchEvent`.
- **The first post-hot-reload run can lie.** Re-run before trusting a failure.

---

## 8. Quick reference

```tsx
// Make a modal steal focus on open → closing drops focus to <body>, no stray ring.
const ref = useRef<HTMLDivElement>(null);
useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);

<div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} className="outline-none …">
```

- Blue outline after Esc = default focus ring (`outline: auto`, `rgb(0,95,204)`)
  on the still-focused trigger, shown because **Esc set keyboard modality**.
- Mouse close didn't show it because mouse modality + focus moved to `<body>`.
- Fix = focus the dialog on open (`tabIndex={-1}` to allow it, `outline-none` so
  the dialog itself shows nothing). Never `outline:none` on the trigger.
- To reproduce/verify: use **real** input events, not `.click()` /
  `new KeyboardEvent(...)`.
