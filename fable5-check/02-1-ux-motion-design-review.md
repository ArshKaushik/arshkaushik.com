# 02 — Motion, Interaction & UI/Product Craft Review

**Basis:** static analysis of every component and `globals.css` (all motion is CSS/Tailwind — verified: no animation library in `package.json`), plus build output. No browser automation was available, so nothing here claims visual observation; anything that genuinely requires eyes is collected in **"Needs Arsh's visual QA"** at the end. Calibrated to the stated desktop-first intent and the intentional-compression philosophy (content depth is *not* dinged here).

---

## Executive Summary

**Verdict: A coherent, opinionated motion system with real craft in its bones — undermined by one wrong-property animation, one dead-feeling click, and keyboard users being locked out of half the choreography.** The single-easing-token spring system, the reduced-motion coverage (unusually complete — every transition and keyframe has an explicit fallback), and the dashed-hairline visual language add up to a site with a genuine point of view. The gaps are not taste, they're mechanics: a `font-size` hover animation that reflows layout for half a second, a card→overlay transition that can't start until a multi-MB server fetch finishes, and hover-only reveals with no keyboard/focus equivalent.

### Prioritized findings

| # | Finding | Severity | Priority |
|---|---|---|---|
| 1 | Card click → overlay has no feedback until the RSC fetch lands (dead click) | **High** | P0 |
| 2 | NavLink hover animates `font-size` — layout-triggering, causes sibling reflow in the bottom pill | **High** | P1 |
| 3 | Hover-gated card descriptions & title lift have no keyboard/focus equivalent at ≥900px | **High** | P1 |
| 4 | Desktop overlay has no visible close affordance (backdrop dim is 12%; Esc undiscoverable) | Medium | P1 |
| 5 | No focus trap in the modal (logged in report 01 §4; interaction consequence noted here) | Medium | P1 |
| 6 | Overlay enter/exit durations mismatched (opacity 400ms vs transform 520ms) — likely fine, but unverified intent | Low | P2 |
| 7 | Two near-identical durations (511ms / 520ms) in one motion system | Low | P2 |
| 8 | Inline case-study links use default 150ms ease, outside the spring system | Low | P2 |
| 9 | Microcopy: "Ships in" stat label misreads; footer is bare "© 2026" | Low | P2 |
| 10 | Small body type (14px) for long-form case-study reading | Low | P2 |

---

## 1. Complete animation & transition inventory

Every animated surface in the codebase, verified at file:line. **Layout?** = animates a layout-triggering property (reflow per frame) vs. compositor-friendly transform/opacity. **PRM** = `prefers-reduced-motion` handled.

| # | Surface & trigger | Properties | Duration / easing | Layout? | PRM |
|---|---|---|---|---|---|
| A1 | Case-study card title lift, hover ≥900px (`CaseStudyCard.tsx:99`) | `transform: translateY(0→-50px)` | 511ms / spring | ✅ compositor | ✅ |
| A2 | Case-study card description reveal, hover ≥900px (`CaseStudyCard.tsx:91`) | `opacity 0→1` | 511ms / spring | ✅ compositor | ✅ |
| A3 | Sidebar/pill NavLink hover (`NavLink.tsx:41`) | `color` + **`font-size` 12→14px** | 511ms / spring | ❌ **layout** | ✅ |
| A4 | Overlay backdrop fade in/out (`CaseStudyOverlay.tsx:123`) | `opacity 0→1` | **400ms** / spring | ✅ | ✅ |
| A5 | Overlay card slide up/down (`CaseStudyOverlay.tsx:151-153`) | `transform: translateY(100vh→0)` | 520ms / spring | ✅ compositor (huge paint area — see QA-5) | ✅ |
| A6 | BackNav pill slide, synced to overlay `open` (`BackNav.tsx:33-35`) | `transform: translateY(100vh→0)` | 520ms / spring | ✅ | ✅ |
| A7 | MobileNavPill expand/collapse (`MobileNavPill.tsx:102-104` + `:39-41`) | **`grid-template-rows` 0fr↔1fr + `gap` 0↔20px** | 520ms / spring | ❌ layout (contained to the pill) | ✅ |
| A8 | MobileNavPill chevron (`MobileNavPill.tsx:69-71`) | `transform: rotate(0→180deg)` | 520ms / spring | ✅ | ✅ |
| A9 | Bottom-pill entrance on breakpoint entry, keyframe `slide-bottom-pill-in` (`globals.css:238-261`) | `transform: translateY(150%→0)` | 520ms / spring, `both` fill | ✅ | ✅ (`animation: none`) |
| A10 | Inline links in case-study copy, hover (`CaseStudyDetail.tsx:34`) | `color` via `transition-colors` | default 150ms / default ease | ✅ | ➖ (color-only; negligible) |
| A11 | Overlay exit → navigation timing (`CaseStudyOverlay.tsx:93-104`) | JS timer matched to A5 | 520ms; **0ms under reduced motion** | n/a | ✅ explicitly |

**Reduced-motion coverage is exceptional and worth saying plainly:** every transition carries `motion-reduce:transition-none`, both keyframe utilities have `@media (prefers-reduced-motion: reduce) { animation: none }` (`globals.css:247-249, 257-259`), and — the detail most people miss — the *JavaScript* close timer also collapses to 0ms so reduced-motion users aren't left staring at a frozen overlay for half a second (`CaseStudyOverlay.tsx:97-103`). This is a complete, coherent accessibility posture on motion, verified across all 11 entries above.

**The easing system is one token, used everywhere.** `--ease-spring-gentle` is a 51-point `linear()` sampling of a Figma spring (mass 1/stiffness 100/damping 15), peaking at 1.0283 — genuine overshoot a cubic-bezier can't express — defined once in `globals.css:40-47` with browser-support notes. Every surface above (except A10) uses it. That's a motion *system*, not a pile of transitions, and it's rarer in portfolios than it should be.

### Motion findings

**F1 — The card→overlay choreography starts after a server round-trip (High, P0).**
Claim: the most important transition on the site — clicking work → seeing work — begins with dead time. Evidence: the intercepted route is dynamic (`ƒ /(.)work/[slug]` in build output), the payload is ~1.1 MB gzipped for the heaviest study (measured in report 01 §1–2), no `loading.tsx` exists, and `CaseStudyCard.tsx` defines no `active:`/pressed state. Reasoning: motion craft is judged from input to settle. However good the slide-up is, a 1–3s unacknowledged gap before it plays reads as "broken" to exactly the impatient, triaging audience this portfolio serves. Recommendation: fix the payload (report 01 P0s), and add an immediate acknowledgment — an `active:` scale/opacity tick on the card costs one class.

**F2 — Animating `font-size` is the one wrong-property choice in the system (High, P1).**
Claim: NavLink's hover grows text 12→14px over 511ms, forcing per-frame layout + text re-rasterization; in the bottom pill it also moves siblings. Evidence: `NavLink.tsx:41` (`transition-[color,font-size]`); the comment at `:30-35` shows the ≥900px case was thought through (fixed `h-7 w-[180px]` box prevents *sibling* movement) — but below 900px links are shrink-to-fit in a `justify-between` row (`MobileNavPill.tsx:119`, `Sidebar.tsx:55`), so one link growing redistributes the whole row every frame for half a second. Reasoning: font-size is a layout property; even in the fixed-box case the glyphs re-layout and can shimmer, and springing a *text size* produces a wobble effect that reads less "gentle" and more "unstable" (author's own instinct elsewhere is transform-first — A1 does the same visual job correctly). Recommendation: animate `transform: scale(1.1667)` with `transform-origin: left center` (14/12 = 1.1667) and swap the real font-size on transition end, or just accept color-only motion; keep the size change instant.

**F3 — 511ms vs 520ms (Low, P2).** Two near-identical durations coexist: 511ms (A1–A3, documented as the spring's derived settle time, `NavLink.tsx:22-24`) and 520ms (A5–A9). Evidence above. Neither is wrong; having both is a system smell — a future contributor won't know which to reach for. Recommendation: pick one token (a `--duration-spring` themed value) and use it everywhere.

**F4 — A4's 400ms opacity vs A5's 520ms transform (Low, P2/QA).** The backdrop finishes fading 120ms before the card lands; on exit, the backdrop is fully transparent while the card is still exiting for 120ms — during which the "dimming" is gone but the card is mid-flight over the (standalone) home render. Probably an intentional stagger; flagged because exit coherence can't be confirmed without eyes. → QA-3.

**F5 — A9 plays on initial page load, not just on breakpoint *crossings* (Low, QA).** The keyframe fires whenever its media query starts matching (`globals.css:219-222` documents this as the mechanism), which includes first paint at that viewport size. A pill sliding in on every fresh mobile load is a defensible entrance or an annoyance depending on feel — the code can't tell you which. → QA-2.

**F6 — What's *absent* is mostly good restraint.** No scroll-triggered reveals, no staggered hero entrances, no parallax — the home page simply *is there*, and motion is reserved for state changes (hover, open/close, breakpoint handoff). That's a defensible, senior-reading editorial stance. The one absence that costs something: there's no visual continuity between the card thumbnail and the overlay's hero image — same asset, but cropped differently (`xMinYMid slice` on cards at `CaseStudies.tsx:24` vs `xMidYMid slice` in the overlay at `work/[slug]/page.tsx:49`), and the overlay arrives as a sheet from the bottom rather than any card-anchored morph. Given no animation library, a full FLIP morph is out of scope — but the *crop* mismatch is one string away from continuity.

---

## 2. Breakpoints & responsiveness

**Mapped system (from code):** three tiers with one continuous zone —

| Range | Layout | Evidence |
|---|---|---|
| `<600px` | Fluid column (100% − 32px, 16px margins); stats stack vertically; card title/desc in normal flow; overlay is full-bleed page w/ BackNav pill; collapsible MobileNavPill | `globals.css:192-199`, `Hero.tsx:26-38`, `CaseStudyCard.tsx:86-101`, `MobileNavPill.tsx` |
| `600–899px` | Fixed 600px centered column; 520px bottom nav pill; cards fixed-height with description always revealed; overlay full-bleed | `Sidebar.tsx:41`, `CaseStudyCard.tsx:79-84` comments, `CaseStudyOverlay.tsx:123` |
| `≥900px` | 260px sticky sidebar + 600px column; hover-gated card reveals; overlay becomes inset dimmed modal | `Sidebar.tsx:41`, `globals.css:152-158` |
| `900–1120px` | Continuous `clamp(40px, 100vw−860px, 260px)` right-gutter — no breakpoint pop, algebraically smooth handoff | `globals.css:143-158` |

**Honest read:** this is **not** a desktop-only site — it's already a disciplined three-tier responsive system, and an unusually rigorous one (the 600px floor is *derived and empirically verified* — "596px: no overflow; 595px: overflow", `globals.css:177-191` — rather than picked off a device list). The gaps that remain:

- **R1 (High in context): payload, not layout, is the real mobile blocker.** The layout adapts; the 3.7 MB gzipped home page (report 01 §1) does not. On phone networks this is the difference between "opens" and "abandoned."
- **R2 (Medium):** Very wide screens: the column centers in the space beside the sidebar with the gutter capped at 260px, so at ~2560px the composition sits far left with a large empty right field. May be intentional asymmetry; can't judge from code. → QA-6.
- **R3 (Low):** `body` `overflow:hidden` scroll-locking is historically unreliable on iOS Safari (background scroll can bleed through rubber-banding). The overlay is itself the scroll container which mitigates it, but only a device test settles it. → QA-7.
- **How mobile-ready does a 2026 portfolio need to be?** Fully. LinkedIn is the #1 referrer for portfolio links and opens them in its **in-app mobile webview**; a large share of recruiter first-visits happen there, in triage mode, with seconds of patience. Your *layout* is already ~90% of the way. Ship the payload fix and a device-tested pass over the <600px tier and you can honestly retire the "desktop-first" disclaimer — which you should, because "the portfolio of a designer-who-codes" gets judged on exactly this.

---

## 3. UX & interaction

**U1 — Navigation & IA (sound, minimal).** One page + three studies + four external links (`content.ts:6-11`). The overlay-with-URL pattern means every study is shareable/refreshable and browser Back closes it — the full flow (soft nav open → Esc/backdrop/Back close; hard load → identical view, BackNav home) is verified coherent in code (report 01 §Verification). This is genuinely better navigation engineering than most portfolio sites.

**U2 — Desktop overlay close affordance (Medium, P1).** Claim: at ≥900px there is no visible way out. Evidence: `BackNav` is `min-[900px]:hidden` (`BackNav.tsx:30`); closing requires Esc (undiscoverable) or clicking a backdrop dimmed only 12% (`bg-overlay/12`, `CaseStudyOverlay.tsx:123`) — grey-on-grey (#111 at 12% over #f4f4f4) may not read as "modal over page" at all; there is no ✕ button. Reasoning: the audience opens your best work, finishes reading, and gets a moment of "…now what?" — browser Back rescues them, but a hesitation beat at the end of your strongest content is a real cost. Recommendation: a small ✕ (or "Close — Esc") pinned to the card or viewport corner at ≥900px; you already own the pill vocabulary for it.

**U3 — Keyboard parity (High, P1).** Three verified gaps: (a) hover-only reveals at ≥900px — description opacity and title lift respond to `group-hover` only (`CaseStudyCard.tsx:91,99`); a keyboard user tabbing to a card gets a focus ring (default, un-styled — → QA-8) but no reveal: add `group-focus-visible:` variants alongside `group-hover:`; (b) no focus trap in the dialog (report 01 §4); (c) invisible focusable links in the collapsed mobile pill (report 01 §6). None are expensive; together they decide whether the interaction layer reads "crafted" or "crafted for mouse users."

**U4 — In-overlay dead-ends (Low, P2).** The case study ends at "The Hardest Call" with no forward path — no next/previous study, no contact CTA (`CaseStudyDetail.tsx:145-149`). A triaging reviewer who liked what they read must close, scroll, and re-open. A "Next case study →" and a repeated contact link at the article's end are cheap conversion wins for the site's actual goal.

**U5 — Feedback & affordances (mixed).** Cards are true `<Link>`s (cursor, middle-click, cmd-click all work — good). But: no pressed state (F1), and nothing on the card *says* clickable before hover at ≥900px except the pointer. The always-revealed description at 600–899px (a deliberate no-hover-on-touch adaptation, `CaseStudyCard.tsx:79-84`) is the correct call and well-reasoned.

**U6 — Accessibility beyond keyboard.** Verified positives: `role="dialog" aria-modal aria-label` (`CaseStudyOverlay.tsx:118-120`); focus moved into the dialog on open with the *reason* documented (`:63-70`); `role="img"` + `aria-label` wrappers over inlined SVGs whose internals are `aria-hidden` (`CaseStudyCard.tsx:52-54`, `inline-svg.ts:19-22`); real `aria-expanded/-controls` on the pill toggle (`MobileNavPill.tsx:57-59`); `lang="en"`; semantic `main/aside/nav/footer/article/dl`. Verified negatives: no heading structure on home (report 01 §7); no skip link; contrast is *technically* passing but thin — computed ratios: `#6f6f6f` on `#f4f4f4` ≈ **4.6:1**, `#767676` on `#ffffff` ≈ **4.5:1** — both clear WCAG AA for body text with almost zero margin, and the 12px nav links sit right at that floor. One shade darker on both greys buys safety margin with no visible cost.

---

## 4. UI & product-design craft

**C1 — The visual language is distinctive and internally consistent (genuinely good).** The 10px/10px dashed-hairline system — impossible with `border-dashed`, so built as a composable four-layer background-gradient utility with non-inheriting `@property` registration (`globals.css:50-127`) — plus continuous rails via an `::after` overlay (`HomeContent.tsx:10-24`), monochrome palette, and Instrument Serif display over Geist UI: it reads as a deliberate technical-blueprint aesthetic that matches the "designer & engineer" positioning. Every color is a token; there are zero one-off hex values in components (verified by reading all of them). Pixel-integrity obsessions (`round(…,1px)` centering so 1px verticals don't straddle device pixels, `globals.css:160-199`) are the kind of craft detail that survives a design leader's squint.

**C2 — Typography: good pairing, small body (Low, P2).** Scale: 12/14/16/20/24/28/40 — coherent and restrained. But all case-study body copy is 14px (`CaseStudyDetail.tsx:66,117` et al.) at default line-height, for paragraphs that run 3–5 lines in an 800px card (736px measure ≈ 90+ chars/line at 14px — above the ~75ch comfort ceiling). For the longest-form reading on the site, 15–16px body and/or a narrower measure, plus an explicit `leading-relaxed`, would materially improve it. (Desktop hero at 40px serif with `leading-[normal]` is fine.)

**C3 — Spacing/rhythm: consistent.** `p-6` (24px) cells, `gap-8` (32px) article sections, `gap-2` label/value pairs — an even 8px system throughout, matching the stated Figma fidelity. The one magic number acknowledged in-code (the 50px title lift tied to a 2-line description, `CaseStudyCard.tsx:83-85`) is documented with its own fragility warning, which is exactly right.

**C4 — Microcopy (Low, P2).** The hero tagline is a real positioning statement, and the case-study copy is unusually strong — "Command line to control room" is a title with actual craft; metric-led card summaries ("Support tickets fell 50%") are correct for triage-speed reading. Two dings, with evidence: **"Ships in / Figma + Next.js"** (`content.ts:25-27`) parses as a duration ("ships in 2 weeks") before it parses as a toolchain — "Works in" / "Builds with" removes the garden path. **"© 2026"** (`content.ts:36`) is a missed slot: no name, no email echo, no last-updated signal — the footer is the natural resting place at the end of a scroll and currently offers nothing to act on.

**C5 — Empty/edge states.** Unset thumbnails fall back to clean empty boxes by design (`types.ts:30-33`, `CaseStudyCard.tsx:39-41` comments) — fine. Unknown slugs 404 correctly but unbranded (report 01 §12). No loading states exist anywhere, which matters only because of F1.

---

## 5. Needs Arsh's visual QA

Things code review cannot settle — ordered by likely payoff:

1. **Dead-click feel on card → overlay** on a throttled connection (Fast 3G in devtools): how long is click-to-motion, and does it feel broken? (F1)
2. **Bottom-pill entrance on plain page load** at <900px: does the slide-in on *every* load feel like polish or repetition? Also resize across 600px/900px repeatedly — does the pill re-animate distractingly? (F5/A9)
3. **Exit coherence of the overlay**: with the 400ms/520ms mismatch, does the backdrop vanish before the card lands on close? Does the standalone-page close (which then `router.push`es) visually double-jump? (F4)
4. **Enter-animation reliability**: open studies repeatedly (cold loads, CPU-throttled) — does the slide-up ever fail to play (single-rAF race, report 01 §12)?
5. **Scroll & slide jank with the giant SVGs**: on a mid-tier Windows laptop and an older Android, does the overlay slide stutter while painting the multi-thousand-node SVG, and does overlay scrolling jank past it? (A5 caveat)
6. **Ultra-wide composition** at 1920/2560px: does the left-anchored column + capped gutter look intentional or off-balance? (R2)
7. **iOS Safari**: does the background genuinely not scroll behind the overlay (rubber-band test); does the 100vh slide start below the dynamic toolbar without a visible gap? (R3)
8. **Focus rings**: Tab through cards, nav links, and the dialog — is the default ring visible and non-clipped on every focusable (especially white-on-white pill edges), and acceptable-looking against the dashed aesthetic?
9. **NavLink hover wobble**: watch the 12→14px spring closely in the bottom pill — do neighboring links shuffle? (F2)
10. **Backdrop dim sufficiency** at ≥900px: is 12% #111 over #f4f4f4 enough separation between modal and page, especially on low-contrast/bright displays? (U2)
11. **Hover states on touch-with-pointer devices** (iPad + trackpad, touch laptops): do the ≥900px hover-gated reveals strand touch users who don't hover?
12. **Text selection inside the overlay**: select copy and release outside the card — confirm the modal closes (report 01 §5) and decide if you can live with it until fixed.

---

## Bottom line

The motion system, reduced-motion rigor, dashed-hairline language, and navigation architecture are the work of someone who sweats the right details — they'd survive scrutiny from a senior design-engineering reviewer. The failures are concentrated and fixable: one wrong animated property (F2), one dead click that undercuts the best moment on the site (F1), keyboard parity (U3), and a close affordance (U2). Fix those four and the interaction layer matches the quality story the code comments are already telling.
