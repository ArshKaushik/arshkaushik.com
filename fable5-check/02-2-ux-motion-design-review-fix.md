# 02-2 — Fix Log for the UX / Motion / Design Review

**Scope:** every finding from `02-1-ux-motion-design-review.md`, resolved on branch `v1.1-fable5-exp` on 2026-07-15. Findings fall into four buckets: fixed in this round, already fixed by the round-1 engineering fixes (`01-2-code-review-fix.md`), deferred by Arsh's explicit decision, and design calls intentionally left with Arsh. Verification numbers are real command output from this working tree.

## Results at a glance

| # | Finding (from 02-1's table) | Status |
|---|---|---|
| 1 | F1 — Dead click on card → overlay | ✅ Fixed in round 1 (see 01-2, findings 1–2) |
| 2 | F2 — NavLink hover animates `font-size` (layout-triggering) | ✅ **Fixed** — scale-based hover |
| 3 | U3 — Hover reveals have no keyboard equivalent | ✅ **Fixed** — `group-focus-visible` |
| 4 | U2 — No visible close affordance on desktop overlay | ⏸ Deferred — Arsh is designing this himself |
| 5 | Modal focus trap | ✅ Fixed in round 1 (01-2, finding 4) |
| 6 | F4 — Backdrop 400ms vs card 520ms mismatch | ✅ **Fixed** — unified to 520ms |
| 7 | F3 — Two near-identical durations (511/520) | ✅ **Fixed** — single 520ms token |
| 8 | A10 — Inline links outside the spring system | ✅ **Fixed** — brought into the system |
| 9 | C4 — Microcopy ("Ships in"; bare footer) | ✅ **Label fixed** ("Builds with"); footer left by decision |
| 10 | C2 — Small body type for long-form reading | ✅ **Fixed** — `leading-relaxed`, 14px kept |
| — | U6 — No skip link (from the a11y prose) | ✅ **Fixed** — added |
| — | U4 — End-of-study dead end | ⏸ Skipped by decision |

Build health after all changes: `pnpm build` ✅ (12/12 static pages, routes unchanged) · `pnpm lint` ✅ exit 0 · `npx tsc --noEmit` ✅ exit 0 · `graphify update .` ✅ · grep confirms zero `duration-[511ms]`, `duration-[400ms]`, or `hover:text-[14px]` remain in `src/`.

---

## F2 — NavLink hover: `font-size` → `scale` (High, P1)

**The problem being fixed:** hovering a nav link animated `font-size` 12→14px over half a second. Font-size is a layout property — the browser re-ran text layout every frame, and in the bottom-pill tiers (<900px), where links are shrink-to-fit in a `justify-between` row, one link growing re-distributed the whole row per frame, visibly shuffling its neighbors.

**Fix applied (`src/components/ui/NavLink.tsx`):** rest state stays `text-[12px]`; hover now applies `hover:scale-[1.1667]` — 14/12 exactly, so the painted glyphs land at the same 14px the Figma spec asks for — with `origin-left` so text grows rightward from its anchored edge, and `transition-[color,scale]` on the shared spring. The layout box never changes size, so siblings cannot move, and the whole animation runs on the compositor.

**Two implementation subtleties worth recording:**
- **Tailwind v4 trap:** `scale-*` utilities compile to the standalone `scale` CSS property, *not* `transform` — so the transition must name `scale` (`transition-[color,scale]`); a `transform` transition would silently never fire.
- `BackNav`'s "Back" pill inherits the fix automatically — it reuses the exported `navLinkClassName`, which was the point of exporting it.

The file's long teaching comment was rewritten to teach the *correct* pattern (why layout properties are the wrong thing to animate, and the v4 scale/transform distinction), since its whole purpose is to be the reusable reference for future hovers.

**Verification:** grep confirms no `hover:text-[14px]` or `font-size` transitions remain; build/lint/tsc clean. Visual feel → QA-1.

## F3 + F4 — One motion duration: 520ms everywhere (Low, P2)

**Fix applied:** the system had three durations pretending to be one — 511ms (card hover, NavLink; the spring's derived settle time), 520ms (structural motion), and 400ms (overlay backdrop). All transitions now use `duration-[520ms]`:
- `CaseStudyCard.tsx` — title and description reveal transitions (511 → 520).
- `NavLink.tsx` — hover transition (511 → 520, part of the F2 rewrite).
- `CaseStudyOverlay.tsx` — backdrop opacity (400 → 520). Enter/exit are now symmetric and match the close-navigation timer, which was already 520ms — the backdrop previously finished 120ms before the card landed, and on exit went fully transparent while the card was still mid-flight.
- `globals.css` — the `--ease-spring-gentle` comment now states the convention: the spring's ~511ms derived settle is rounded to a single site-wide 520ms token.

**Why:** one easing curve × one duration = exactly one motion pace to reason about; the 9ms difference between 511 and 520 was imperceptible but forced every future contributor to guess which was canonical.

**Caveat flagged for QA:** the 400ms backdrop *may* have been an intentional stagger. If the unified exit feels heavy, the revert is one string (`duration-[400ms]` on the dialog root). → QA-2.

## U3 — Keyboard parity for the card reveals (High, P1)

**Fix applied (`CaseStudyCard.tsx`):** the ≥900px hover-gated reveals now fire on keyboard focus too — `min-[900px]:group-focus-visible:opacity-100` on the description and `min-[900px]:group-focus-visible:-translate-y-[50px]` on the title, alongside the existing `group-hover` variants. Tabbing to a card reveals exactly what hovering does (the card `<Link>` is the `group` and the focusable, so `group-focus-visible` keys off it directly). The other two keyboard gaps the review grouped here — the missing focus trap and the invisible-but-tabbable collapsed pill links — were already closed in round 1 (01-2, findings 4 and 6).

**Verification:** build/lint/tsc clean; behavior is definitionally hover-equivalent (same classes, second trigger). Ring + reveal appearance → QA-3.

## A10 — Inline case-study links joined the motion system (Low, P2)

**Fix applied (`CaseStudyDetail.tsx`, `renderInline`):** the markdown-link hover was the one transition outside the system (bare `transition-colors`, default 150ms/ease). Now: `transition-colors duration-[520ms] ease-spring-gentle motion-reduce:transition-none` — same token pair and reduced-motion posture as every other hover on the site.

## C2 — Reading comfort: `leading-relaxed` (Low, P2) — *Arsh's decision: 1.625, 14px unchanged*

**Fix applied (`CaseStudyDetail.tsx`):** all long-form copy — summary, the shared context paragraph, The Problem / The Real Problem / The Hardest Call bodies, every What-I-did/Impact `Point`, and the metadata `<dd>` values — now carries `leading-relaxed`: line-height 1.5 → 1.625, i.e. 21px → ~22.75px per line at 14px. The font size stays exactly per Figma. Rationale is documented in the component's file-level comment: these paragraphs run ~90+ characters per line at the card's 736px measure, and the taller line box is what helps the eye track back to the next line at that length.

**Deliberately NOT applied to `CaseStudyCard`'s home-card description:** its 600–900px layout depends on that text being exactly 42px tall (2 × 21px lines — the documented 50px title-lift math). Changing its line-height would break the reveal geometry.

## C4 — Microcopy (Low, P2) — *Arsh's decision: label only*

**Fix applied (`src/lib/content.ts`):** the hero stat label `"Ships in"` → `"Builds with"` — the old label garden-pathed as a duration ("ships in 2 weeks") before reading as a toolchain. A comment preserves the why.
**Left by decision:** the bare `"© 2026"` footer. Open suggestion on record: add name and/or a contact echo (e.g. "© 2026 Arsh Kaushik") — one string in `content.ts` whenever wanted.

## U6 — Skip link (from the review's a11y audit)

**Fix applied:** `layout.tsx` now renders the page's first focusable element — an `href="#content"` skip link that is `sr-only` until keyboard-focused, at which point it paints as an on-system pill (white surface, dashed edges, the shared shadow token) fixed at the top-left. `HomeContent.tsx`'s `<main>` got `id="content"` as the target. Keyboard users' first Tab now offers a jump past the sidebar's five stops; mouse and touch users never see it.

---

## Already fixed in round 1 (cross-reference: `01-2-code-review-fix.md`)

| 02-1 finding | Where it was fixed |
|---|---|
| F1 dead click (click → server fetch with zero feedback) | 01-2 findings 1–2: pages 11.2MB → 35.9KB; `active:opacity-70` pressed state |
| #5 no focus trap in the modal | 01-2 finding 4: `inert` ancestor-walk |
| Invisible focusable links in collapsed pill (U3c) | 01-2 finding 6: `inert={!expanded}` |
| R1 payload as the real mobile blocker | 01-2 finding 1 |
| Unbranded 404 (C5) | 01-2 finding 12: branded `not-found.tsx` |

## Deferred / left with Arsh (with the one-line change each would take)

- **U2 — desktop close affordance:** deferred at Arsh's request — he'll design the control himself. Until then: Esc + backdrop click remain the exits; the review's severity stands.
- **U4 — end-of-study footer (next study / contact):** skipped by decision.
- **F6 — crop continuity:** card thumbnails crop left-anchored (`object-left`), the detail hero center-crops; continuity would be `object-left` on `CaseStudyDetail`'s `<Image>` — left as a Figma-fidelity call.
- **F5 — pill entrance animates on initial page load,** not just breakpoint crossings — inherent to the media-query-scoped keyframe technique; suppressing it on first load needs JS state. Judge by feel first (QA-5).
- **U6 contrast margins:** `#6f6f6f`/`#767676` pass WCAG AA at ~4.6:1/~4.5:1 with near-zero margin. Darkening is a brand-token decision, so untouched.
- **QA-8 default focus rings:** functional; custom-styling them is a design pass.

## Needs Arsh's visual QA (updated — supersedes 02-1's list)

Resolved since the original list: dead-click feel (QA-1 old — payload fixed, re-check is item 6 below), text-selection closing the overlay (QA-12 old — fixed in 01-2 finding 5), thumbnail jank items (superseded by the WebP switch — see 01-2's QA list for the iPhone crispness check, still pending).

1. **NavLink hover feel & crispness** — the scale-based growth should look identical to the old font-size version but without neighbor-shuffle in the bottom pill. Also squint at glyph sharpness mid-animation and settled (scaled text rasterization).
2. **Unified 520ms backdrop** — open/close a study at ≥900px: does the backdrop now landing *with* the card feel better or heavier than the old 120ms stagger? One-string revert if worse.
3. **Keyboard reveal** — Tab to a card at ≥900px: focus ring + title lift + description fade should all fire together and look intentional.
4. **`leading-relaxed` in the case study** — read a full study; the 1.75px/line breathing room should be felt, not seen.
5. **Pill entrance on plain page load** (<900px) — polish or repetition? (Held over from the original list; unchanged by decision.)
6. **Re-check the card click** on Fast-3G throttling — with 5.7KB pages + pressed state, the dead click should be gone end-to-end.
7. **Skip link** — press Tab once on a fresh load: the pill should appear top-left, and Enter should land you at the content.
8. **"Builds with" stat** — confirm the new label sits right in the hero's voice.

## Full verification transcript (2026-07-15)

```
mv 02-ux-motion-design-review.md → 02-1-ux-motion-design-review.md   ✅
pnpm build        ✅ 12/12 static pages; route table unchanged
pnpm lint         ✅ exit 0, no output
npx tsc --noEmit  ✅ exit 0, no output
grep 511ms/400ms/hover:text-[14px] in src/   ✅ zero matches
graphify update . ✅ graph rebuilt
git               ⛔ untouched — no commits, no staging (not requested)
```
