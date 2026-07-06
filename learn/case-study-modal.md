# The URL-Addressable Case-Study Modal — Full Build Walkthrough

This is the complete story of how the case-study overlay was built: the content
schema, the file/folder structure, the Next.js routing tricks that make it a
**shareable, back-button-friendly modal**, the backdrop + slide-up animation, and
the close/accessibility logic — end to end, with annotated code.

It's written to be re-usable: by the end you should be able to build the same
"click a card → it opens as an overlay with its own URL, refresh → it's a full
page" pattern in any Next.js App Router project.

> Assumed background: you can read React/TS but are newer to Next.js. Concept
> boxes marked **▶ Next.js** explain the framework-specific pieces. Related deep
> dives live in `learn/case-study-card-hover.md` (the card hover + spring easing)
> and `learn/focus-visible-outline.md` (the focus-ring fix referenced in §8).

---

## 1. The behaviour we're building (the spec)

From the home page's "Selected work" list:

1. **Click a card** → the case study opens as an **overlay on top of the dimmed
   home page** (home stays visible/mounted behind it).
2. The overlay is **URL-addressable**: the address bar becomes `/work/<slug>`, so
   the state is **shareable** and the **browser Back button closes it**.
3. It **slides up from the bottom** while the backdrop fades in.
4. It closes on **Esc**, **clicking the backdrop**, or **Back** — playing the
   animation in reverse.
5. **Directly loading / refreshing / sharing** `/work/<slug>` shows a **full
   standalone page** (not a floating overlay), because there's no home page to
   float over yet.

Point 5 is the subtle one, and it's exactly what Next.js **intercepting routes**
give us for free. Let's build up to it.

---

## 2. A quick Next.js foundation

Only the pieces this feature uses. Skip if you know them.

**▶ Next.js — the App Router & file-based routing.** In the App Router, the
`src/app/` folder *is* your routing table. A folder = a URL segment; a `page.tsx`
in it = a routable page.
```
app/page.tsx              → /
app/work/page.tsx         → /work
app/work/[slug]/page.tsx  → /work/:slug   ([slug] = dynamic segment)
```

**▶ Next.js — Server vs Client Components.** Everything under `app/` is a
**Server Component by default**: it runs on the server, can be `async`, can read
data directly, and ships **no JS** to the browser. To use state/effects/events
(`useState`, `useEffect`, `onClick`) a file must opt in with `"use client"` at
the top. Rule of thumb: keep pages as server components; push interactivity into
small client components. (Our detail card is a server component; only the
interactive overlay is a client component.)

**▶ Next.js — `layout.tsx`.** A layout wraps every page under it and **persists
across navigations** (it doesn't re-mount when you move between its child pages).
The root `app/layout.tsx` renders `<html>`/`<body>`. This persistence is what lets
the home page stay alive behind the modal.

**▶ Next.js — dynamic params are async.** In Next 15+, a page's `params` is a
**Promise** you must `await`:
```tsx
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;   // ← await it
}
```

**▶ Next.js — `<Link>` = soft navigation.** `next/link`'s `<Link href>` does a
**client-side ("soft") navigation**: React swaps the page in place, no full
reload, layouts persist. Typing a URL / refreshing / opening a shared link is a
**"hard" navigation**: a fresh document load. **This soft-vs-hard distinction is
the hinge the whole modal turns on.**

**▶ Next.js — SSG via `generateStaticParams`.** Returning the known dynamic
values at build time pre-renders those pages to static HTML (fast, cacheable).

---

## 3. The two Next.js super-powers: Parallel + Intercepting routes

### 3a. Parallel Routes (`@folder` "slots")

A folder named `@something` is a **parallel route slot** — a second, independent
subtree that renders *alongside* `children` in the same layout. The layout
receives it as a **prop named after the slot**.

```
app/
├── layout.tsx      receives { children, modal }
├── page.tsx        → fills `children` at "/"
└── @modal/         → fills the `modal` prop  (the "@modal" → `modal`)
```

`@modal` does **not** add a URL segment — it's invisible to the path. It's just a
second "hole" in the layout we can fill independently of the main content. We'll
render the overlay into it so it layers over whatever `children` is showing.

**▶ Next.js — `default.tsx` is mandatory for slots.** On a hard load, a slot that
has no matching route for the current URL doesn't know what to show, and Next.js
will 404 the whole page unless the slot has a `default.tsx`. Ours just renders
nothing:
```tsx
// app/@modal/default.tsx — the slot's "show nothing" fallback
export default function ModalDefault() {
  return null;
}
```
So at `/` (and on a hard load of `/work/<slug>`) the `modal` slot is empty.

### 3b. Intercepting Routes (`(.)` prefix)

An intercepting route lets one route **"catch" a soft navigation to another
route** and render *something else instead* — while keeping the URL. The prefix
says how far up to look for the route being intercepted:

| Prefix | Intercepts a route… |
|---|---|
| `(.)` | on the **same** level |
| `(..)` | **one** level up |
| `(..)(..)` | two levels up |
| `(...)` | from the **app root** |

> ⚠️ The levels count **route segments**, and parallel-route slots (`@modal`) are
> **transparent** to that count. Our target `work/[slug]` lives at the app root,
> and our interceptor lives at `@modal/(.)work/[slug]` — since `@modal` doesn't
> count, the interceptor is "at root level" catching `work` "at root level", so
> `(.)` is correct here. Getting this prefix wrong is the #1 cause of "my modal
> doesn't intercept" — **always test both soft-click and hard-refresh.**

### 3c. How they combine (the whole trick in one table)

We have **two** routes for the same `/work/<slug>` URL:

```
app/@modal/(.)work/[slug]/page.tsx   ← the INTERCEPTOR → renders the OVERLAY
app/work/[slug]/page.tsx             ← the REAL route  → renders the FULL PAGE
```

Which one runs depends on **how** you arrived:

| You arrive by… | `children` slot shows | `modal` slot shows | Result |
|---|---|---|---|
| Being on `/` | home (`page.tsx`) | `default.tsx` → null | just the home |
| **Clicking a card** (soft nav) | home *stays* | **interceptor** → `<CaseStudyOverlay>` | **overlay over home** ✅ |
| **Refresh / shared link** (hard nav) | `work/[slug]/page.tsx` (full page) | `default.tsx` → null | **full standalone page** ✅ |
| Press **Back** from the overlay | home | back to `default.tsx` → null | overlay gone |

Interception **only happens on soft navigation.** A hard load bypasses the
interceptor entirely and hits the real page. That single fact delivers spec
points 2 and 5 with no extra code.

---

## 4. File & folder structure

```
src/
├── app/
│   ├── layout.tsx                     # declares the `modal` slot, renders {modal}
│   ├── page.tsx                       # home "/" (renders <CaseStudies/>)
│   ├── @modal/
│   │   ├── default.tsx                # slot fallback → null
│   │   └── (.)work/[slug]/page.tsx    # INTERCEPTED route → <CaseStudyOverlay/>
│   └── work/[slug]/page.tsx           # standalone full page (hard nav)
│
├── components/
│   ├── sections/CaseStudies.tsx       # the "Selected work" list
│   ├── ui/CaseStudyCard.tsx           # each card = <Link href="/work/[slug]">
│   └── case-study/
│       ├── CaseStudyOverlay.tsx       # "use client": backdrop + animation + close
│       └── CaseStudyDetail.tsx        # presentational card (shared by BOTH routes)
│
└── lib/case-studies/                  # the content layer (data + schema)
    ├── types.ts                       # CaseStudy / CaseStudyMeta / CaseStudyPoint
    ├── shared.ts                      # companyContext (paragraph shared by all)
    ├── design-system.ts               # one case study (data)
    ├── connector-config.ts            # one case study (data)
    ├── command-line.ts                # one case study (data)
    └── index.ts                       # caseStudies[] + type re-exports (the "barrel")
```

Two design rules shaped this:
- **Presentation is separate from where it's shown.** `CaseStudyDetail` is a dumb,
  reusable card. Both the overlay *and* the full page just wrap it — zero
  duplicated markup, guaranteed identical content.
- **Content is separate from components.** All copy lives in `lib/case-studies/`
  as typed data, never hard-coded in JSX. Components receive a `CaseStudy` object.

---

## 5. The content layer & schema (how the data was planned)

Before any UI, I modelled the content. The source was three markdown case studies
with a shared anatomy: *deck → metadata table → problem / real problem → what I
did / impact bullets → the hardest call*. I turned that anatomy into a **type**,
so every study is forced into the same shape and the UI can rely on it.

### 5a. The types — `lib/case-studies/types.ts`
```ts
// A metadata row. Labels differ per study (Role / Team / Timeline / Stack…),
// so it's an ORDERED list of pairs, not fixed keys.
export type CaseStudyMeta = { label: string; value: string };

// A "What I did" / "Impact" bullet: a bold lead-in + supporting detail.
// `body` can be "" when the bullet is a single statement.
export type CaseStudyPoint = { lead: string; body: string };

export type CaseStudy = {
  slug: string;              // URL id → /work/<slug>
  title: string;             // H1
  deck: string;              // one-line subtitle (unused by this view; kept for later)
  summary: string;           // teaser on the home card AND the overlay blurb
  meta: CaseStudyMeta[];     // metadata table rows, in order
  context: string;           // shared company paragraph (see shared.ts)
  problem: string;
  realProblem: string;
  whatIDid: CaseStudyPoint[];
  impact: CaseStudyPoint[];  // bullets carry the headline metrics
  hardestCall: string;
};
```
Decisions worth copying:
- **`meta` is an array of `{label, value}`, not an object with fixed keys.** Studies
  have different rows ("Team" vs "Teams", "Stack" vs "Method & tools"), and arrays
  **preserve order**. Fixed keys would've been a straitjacket.
- **Bullets are structured (`{lead, body}`), not pre-formatted strings.** The design
  renders the lead in black and the body in grey — so the data must keep them
  *separate* and let the component style them. Storing `"**lead** body"` would push
  styling into the data. (We still allow light markdown in strings — see §7.)
- **Every field is typed**, so a missing/renamed field is a compile error, not a
  runtime surprise.

### 5b. Shared copy — `lib/case-studies/shared.ts`
One paragraph is identical across all studies, so it lives once:
```ts
export const companyContext =
  "[Precisely](https://www.precisely.com) is an enterprise data-integrity company…";
```
Each study sets `context: companyContext`, so editing it updates all three. (The
`[text](url)` is inline markdown that the card renders as a real link — see §7.)

### 5c. One file per study + a "barrel" — `index.ts`

Each study is its own file (`design-system.ts` etc.) exporting one typed object:
```ts
// lib/case-studies/design-system.ts
import type { CaseStudy } from "./types";
import { companyContext } from "./shared";

export const designSystem: CaseStudy = {
  slug: "design-system",
  title: "The design system that skipped Figma",
  summary: "A code-first design system built with agentic AI …",
  meta: [
    { label: "Role", value: "Co-led — 1 of 6 designers …" },
    { label: "Team", value: "5 designers + 1 embedded UI engineer" },
    // …
  ],
  context: companyContext,
  problem: "…",
  whatIDid: [{ lead: "Went code-first.", body: "Stress-tested agentic AI …" }],
  impact:   [{ lead: "~30% faster design-to-ship", body: "measured against …" }],
  hardestCall: "…",
  // …
};
```
Then a single **barrel file** collects them and re-exports the types:
```ts
// lib/case-studies/index.ts
import { designSystem } from "./design-system";
import { connectorConfig } from "./connector-config";
import { commandLine } from "./command-line";

export type { CaseStudy, CaseStudyMeta, CaseStudyPoint } from "./types";

// Array order = display order. Add a study by creating its file + appending here.
export const caseStudies = [designSystem, connectorConfig, commandLine];
```

**▶ Why a barrel?** Everywhere else imports from one place — `import { caseStudies }
from "@/lib/case-studies"` — instead of reaching into individual files. Adding a
study is: create a file, append one line here. The list, the home cards, the
routes, and SSG all update automatically because they all read `caseStudies`.

> **▶ Next.js — the `@/` import alias.** `@/lib/...` maps to `src/...` (configured
> in `tsconfig.json` `paths`). It avoids `../../../` import chains.

---

## 6. Cards → links (the entry point)

The list maps over the data and hands each card its `slug`:
```tsx
// components/sections/CaseStudies.tsx
{caseStudies.map((study, index) => (
  <CaseStudyCard
    key={study.title}
    slug={study.slug}
    title={study.title}
    description={study.summary}
    isFirst={index === 0}
  />
))}
```

The card itself is a **`<Link>`** — this is what makes clicking it a *soft*
navigation (and therefore intercept-able):
```tsx
// components/ui/CaseStudyCard.tsx
import Link from "next/link";

export default function CaseStudyCard({ slug, title, description, isFirst }) {
  return (
    <Link href={`/work/${slug}`} className="group … dashed dash-b …">
      {/* thumbnail + hover title/description (see case-study-card-hover.md) */}
    </Link>
  );
}
```
That `href={`/work/${slug}`}` is the whole handoff: it points at the real route,
but because it's a `<Link>`, the interceptor catches it and shows the overlay.

---

## 7. The presentational card — `CaseStudyDetail.tsx`

This is a **server component** (no `"use client"`, no interactivity). It's the
single source of truth for how a case study *looks*, and it's rendered by **both**
the overlay and the full page. It just walks the `CaseStudy` object into markup:

```tsx
export default function CaseStudyDetail({ study }: { study: CaseStudy }) {
  return (
    <article className="flex w-[800px] max-w-full flex-col gap-8 dashed dash-x dash-y bg-surface p-8">
      <h1 className="font-serif text-[28px]">{study.title}</h1>
      <p>{renderInline(study.summary)}</p>

      <div className="h-[394px] w-full bg-page" />   {/* visual placeholder */}

      <dl className="… dashed dash-x dash-y">        {/* metadata table */}
        {study.meta.map((row, i) => (
          <div key={row.label} className={i < study.meta.length - 1 ? "dashed dash-b" : ""}>
            <dt>{renderInline(row.label)}</dt>
            <dd>{renderInline(row.value)}</dd>
          </div>
        ))}
      </dl>

      <p>{renderInline(study.context)}</p>

      <Section heading="What I did">
        {study.whatIDid.map((p) => <Point key={p.lead} point={p} />)}
      </Section>
      {/* …Problem / Real Problem / Impact / Hardest Call the same way… */}
    </article>
  );
}
```

Two small helpers keep it DRY: `Section` (a 20px heading + its children) and
`Point` (renders a bullet as `<span className="black">{lead}</span> {body}`).

**The `renderInline` helper** turns a stored string into React nodes: it strips
the light `**bold**`/`*italic*` markdown (the design shows prose plain) but turns
`[text](url)` into a real new-tab `<a>`. It has to return *nodes*, not a string,
because a string can't contain an `<a>` element:
```tsx
const renderInline = (s: string): React.ReactNode => {
  const stripEmphasis = (t: string) =>
    t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;     // [visible](url)
  const nodes: React.ReactNode[] = [];
  let cursor = 0, key = 0, match: RegExpExecArray | null;
  while ((match = linkPattern.exec(s)) !== null) {
    if (match.index > cursor) nodes.push(stripEmphasis(s.slice(cursor, match.index)));
    const [, text, url] = match;
    nodes.push(<a key={key++} href={url} target="_blank" rel="noopener noreferrer"
                  className="underline underline-offset-2">{text}</a>);
    cursor = match.index + match[0].length;
  }
  if (cursor < s.length) nodes.push(stripEmphasis(s.slice(cursor)));
  return nodes.length === 1 ? nodes[0] : nodes;  // no link → plain string, as before
};
```

Because `CaseStudyDetail` is shared, **the overlay and the standalone page can
never drift apart** — fix a typo once, both update.

---

## 8. The overlay — `CaseStudyOverlay.tsx` (the interactive part)

This is the **only client component** in the system (`"use client"`), because it
needs state, effects, and event handlers. It renders the backdrop, animates the
card in/out, and handles closing. Here it is with the reasoning inline:

```tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CaseStudyDetail from "./CaseStudyDetail";

export default function CaseStudyOverlay({ study }: { study: CaseStudy }) {
  const router = useRouter();
  // `open` drives BOTH transitions. Starts false (card off-screen, backdrop clear)
  // and is flipped true on the next frame so the browser animates the change.
  const [open, setOpen] = useState(false);
  const closingRef = useRef(false);          // guards against double-close
  const dialogRef = useRef<HTMLDivElement>(null);

  // (a11y + bug fix) Move focus INTO the dialog on open, so closing drops focus
  // to <body> instead of leaving a focus ring on the card. Full story:
  // learn/focus-visible-outline.md
  useEffect(() => { dialogRef.current?.focus({ preventScroll: true }); }, []);

  // ENTER animation: flip `open` true after mount, on the next paint frame.
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Lock background scroll while the overlay is up; restore on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // CLOSE: play the exit transition, THEN navigate back (which unmounts us).
  const close = useCallback(() => {
    if (closingRef.current) return;           // don't run twice (Esc + backdrop)
    closingRef.current = true;
    setOpen(false);                           // triggers the reverse animation
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => router.back(), reduce ? 0 : 520);  // wait out the anim
  }, [router]);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      ref={dialogRef}
      role="dialog" aria-modal="true" aria-label={study.title} tabIndex={-1}
      onClick={close}                          // clicking the BACKDROP closes
      className={`fixed inset-0 z-50 flex flex-col items-center overflow-y-auto
                  bg-overlay/12 px-2.5 py-20 outline-none
                  transition-opacity duration-[400ms] ease-spring-gentle
                  motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
    >
      {/* Clicks INSIDE the card must NOT bubble up to the backdrop's onClick. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`transition-transform duration-[520ms] ease-spring-gentle
                    motion-reduce:transition-none
                    ${open ? "translate-y-0" : "translate-y-[100vh]"}`}
      >
        <CaseStudyDetail study={study} />
      </div>
    </div>
  );
}
```

### 8a. The enter/exit animation (the "why" behind `open`)

A CSS transition animates *between two states*. So we need the element to first
exist in its "closed" style, then change to "open" — the change is what animates.
- **On mount** `open` is `false` → backdrop `opacity-0`, card `translate-y-[100vh]`
  (one viewport below the screen).
- A `requestAnimationFrame` flips `open` to `true` **on the next frame** → backdrop
  `opacity-100`, card `translate-y-0`. The browser animates the difference → the
  card **slides up from the bottom** and the backdrop fades in.
- **On close**, `setOpen(false)` returns to the closed styles → it animates in
  reverse. We wait `520ms` (the transition duration) via `setTimeout`, *then*
  `router.back()` unmounts it.

> **▶ Why `requestAnimationFrame`?** If you set `open` to `true` synchronously on
> mount, the browser may paint the "open" state directly with no "closed" frame in
> between — no transition. `rAF` guarantees one painted "closed" frame first.

> **▶ Why a timer instead of `onTransitionEnd`?** Under `prefers-reduced-motion`
> there's no transition, so `transitionend` would never fire and the modal would
> never close. The timer (0ms when reduced, 520ms otherwise) always fires.

The `bg-overlay/12` is the dim: a custom color token `--color-overlay: #111111` in
`globals.css`, at 12% opacity (Tailwind's `/12`). `ease-spring-gentle` is a spring
easing curve sampled from Figma (see `case-study-card-hover.md`).

### 8b. Closing three ways, one path

- **Backdrop click:** the backdrop `<div>` has `onClick={close}`. The inner card
  wrapper has `onClick={(e) => e.stopPropagation()}` so clicks *on the card* don't
  bubble up and close it. (Classic modal pattern.)
- **Esc:** a `keydown` listener on `document`.
- **Back button / swipe:** the browser pops history to `/` on its own, which
  unmounts the intercepted route — no code needed. (This one skips the exit
  animation; acceptable.)

All the in-app closes funnel through `close()`, whose whole job is *animate, then
`router.back()`*. **`router.back()` is deliberate:** clicking the card pushed
`/work/<slug>` onto history, so going *back* returns to `/` and keeps history
clean (no forward-stack pollution). The `closingRef` guard stops a double-trigger
(e.g. Esc while a backdrop click is already animating) from calling `router.back()`
twice.

---

## 9. Wiring the routes together

### 9a. The layout declares the slot — `app/layout.tsx`
```tsx
export default function RootLayout({
  children,
  modal,                       // ← the @modal parallel-route slot, as a prop
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-start">
          <Sidebar />
          <div className="flex flex-1 items-start pr-[260px]">{children}</div>
        </div>
        {modal}                {/* rendered AFTER the main content → layers on top */}
      </body>
    </html>
  );
}
```
`{modal}` sits after the main container so the `fixed inset-0 z-50` overlay stacks
above everything.

### 9b. The interceptor — `app/@modal/(.)work/[slug]/page.tsx`
A **server component** that looks up the study and renders the client overlay:
```tsx
import { notFound } from "next/navigation";
import { caseStudies } from "@/lib/case-studies";
import CaseStudyOverlay from "@/components/case-study/CaseStudyOverlay";

export default async function CaseStudyModal({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = caseStudies.find((c) => c.slug === slug);
  if (!study) notFound();                    // unknown slug → 404
  return <CaseStudyOverlay study={study} />;
}
```

### 9c. The real page — `app/work/[slug]/page.tsx`
Same lookup, but renders the shared card centered in the normal layout, plus SSG
and per-page metadata for shared links:
```tsx
export function generateStaticParams() {                 // pre-render all slugs
  return caseStudies.map((study) => ({ slug: study.slug }));
}
export async function generateMetadata({ params }) {     // <title>/<meta> for sharing
  const { slug } = await params;
  const study = caseStudies.find((c) => c.slug === slug);
  return study ? { title: `${study.title} — ${identity.name}`, description: study.summary } : {};
}
export default async function CaseStudyPage({ params }) {
  const { slug } = await params;
  const study = caseStudies.find((c) => c.slug === slug);
  if (!study) notFound();
  return (
    <div className="flex w-full justify-center px-2.5 py-20">
      <CaseStudyDetail study={study} />       {/* same card, no overlay chrome */}
    </div>
  );
}
```

Notice both route files do the **same 3 lines** (`await params` → `find` →
`notFound`). That's intentional: the lookup is trivial and duplicating it keeps
each route independently readable. The heavy lifting (markup) is shared via
`CaseStudyDetail`; only the *framing* differs.

---

## 10. End-to-end data flow (two scenarios)

**Scenario A — click a card (soft nav):**
```
click <Link href="/work/design-system">
  → Next soft-navigates; URL = /work/design-system
  → children slot: home page STAYS (layout persisted)
  → modal slot: (.)work/[slug] interceptor runs
        → find study by slug → <CaseStudyOverlay study>
        → "use client" overlay: rAF flips open→true → slides up over dimmed home
Esc / backdrop / Back → close() → reverse anim → router.back() → URL = / → overlay unmounts
```

**Scenario B — open /work/design-system directly (hard nav):**
```
browser loads /work/design-system fresh
  → interception does NOT run (soft-nav only)
  → modal slot: default.tsx → null
  → children slot: work/[slug]/page.tsx → full standalone page (SSG HTML)
```
Same URL, same content, two presentations — chosen automatically by *how you got
there*.

---

## 11. Gotchas & things worth remembering

- **Interception prefix is by route segment; slots are transparent.** `@modal/(.)work`
  intercepts root-level `work`. If interception silently doesn't happen, this
  prefix is the first suspect. Test soft-click *and* hard-refresh.
- **Every slot needs `default.tsx`** or hard loads 404. Returning `null` = "show
  nothing here."
- **`params` is a Promise** in Next 15/16 — `await` it, or you get a type error /
  `undefined`.
- **Client boundary is minimal.** Only `CaseStudyOverlay` is `"use client"`. Server
  components can be *rendered by* client components as children (the overlay renders
  the server `CaseStudyDetail`) — that's fine and keeps JS small.
- **Animate by toggling a state class + `requestAnimationFrame`**, and **close on a
  timer, not `transitionend`**, so reduced-motion still works.
- **`router.back()` (not `router.push("/")`)** to close — it respects real history
  and the Back button, and avoids a growing forward stack.
- **Favicons / other file-based metadata override config** — unrelated to the modal
  but the same "file conventions win" theme (see the favicon change).
- **The stray focus ring after Esc** was a real bug fixed by moving focus into the
  dialog — see `learn/focus-visible-outline.md`.

---

## 12. Replicating this in a new project (checklist)

1. **Model the content**: a `types.ts` with one type per entity; one data file each;
   an `index.ts` barrel exporting an array + the types.
2. **Build a presentational component** that takes one item and renders it — no
   data fetching, no interactivity. This gets reused by both routes.
3. **Add the real route**: `app/thing/[id]/page.tsx` — look up the item, `notFound()`
   if missing, render the presentational component in a normal layout. Add
   `generateStaticParams` + `generateMetadata`.
4. **Add the parallel slot**: `app/@modal/default.tsx` → `return null`, and render
   `{modal}` in `app/layout.tsx` (add `modal` to the layout's props).
5. **Add the interceptor**: `app/@modal/(.)thing/[id]/page.tsx` — same lookup, but
   render a client `<Overlay>` wrapping the presentational component.
6. **Make the trigger a `<Link href="/thing/[id]">`** so it's a soft navigation.
7. **Build the client `<Overlay>`**: `fixed inset-0` backdrop with a dim + an
   `open` state (rAF to flip it), `onClick={close}` on the backdrop, `stopPropagation`
   on the inner content, an Esc listener, scroll lock, focus-in on mount, and
   `close()` = animate then `router.back()`.
8. **Verify**: click → overlay + URL change; Esc/backdrop/Back close it; refresh
   the URL → full page; unknown id → 404.

---

## 13. TL;DR

- **Parallel route** `@modal` = a second slot in the layout for the overlay; needs
  `default.tsx` (→ null).
- **Intercepting route** `(.)work/[slug]` catches *soft* clicks and renders the
  overlay over the still-mounted home; *hard* loads fall through to the real
  `work/[slug]` full page. Same URL, two presentations.
- **One presentational component** (`CaseStudyDetail`) is shared by both, so they
  never diverge.
- **Content is typed data** in `lib/case-studies/` (type + file-per-item + barrel).
- **The overlay** is the only client component: `open` state + `requestAnimationFrame`
  for enter, animate-then-`router.back()` for exit, backdrop-click / Esc / Back to
  close, scroll lock + focus management for polish/a11y.
- **Shareable + Back-friendly for free**, because the state lives in the URL and
  interception is soft-nav-only.
```
click card ─(soft)→ /work/slug ─→ @modal interceptor ─→ overlay over home
open URL   ─(hard)→ /work/slug ─→ real page ─→ full standalone page
```
