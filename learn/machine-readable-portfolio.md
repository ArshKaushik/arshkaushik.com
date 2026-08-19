# Making the Portfolio Machine-Readable — Structured Data + llms.txt

Recruiters and design leaders increasingly ask an AI instead of a search engine.
Two things happen when one meets this portfolio, and they need different work:
**discovery** ("find me a designer who…" — the AI has to *match*) and
**evaluation** ("here's his portfolio, assess him" — the AI has to *extract*).
Before this change the site served neither well: no structured data, no
`llms.txt`, and a home page carrying 142 visible words.

This document is in two halves:

- **Part 1 — The plan**, exactly as approved before any code was written.
- **Part 2 — What actually happened**, written after execution: what was built,
  how, why, and what the verification turned up.

---

# Part 1 — The plan (as approved)


## Context

Two different things happen when an AI meets this portfolio, and they need
different work:

**Discovery** — *"find me a product designer who can also code and has done
enterprise agentic work."* The AI searches and has to **match** on facts.

**Evaluation** — *"here's his resume and portfolio, assess his candidature."* The
AI is handed the URL and has to **extract a complete picture** from what it fetches.

Neither works well today.

| What a machine sees | |
|---|---|
| `<title>` | `Arsh Kaushik \| Product Designer` — doesn't say he codes |
| `<meta description>` | *"Solving the problem behind the stated problem through design & engineering"* — no matchable facts: no "enterprise", no "design system", no "agentic", no framework names |
| Structured data | **none** |
| `llms.txt` | **none** |
| **Home page visible text** | **142 words — and ~40 of those are the nav rendered twice** (Sidebar and MobileNavPill are both in the DOM, one hidden by CSS) |

That last row is the evaluation problem in one number. **~100 words of unique
substance** is the entire first impression if the AI doesn't follow links.
Everything that supports a judgement — role and scope ("Co-led — 1 of 5 designers…
23 person design org"), problem framing, what he did, the metrics, the hardest call
— lives on `/work/[slug]`.

Mitigating factors, verified: all three case studies **are** real
`<a href="/work/…">` links and are in the sitemap, so a link-following AI reaches
the depth. And because the standalone route renders the home content behind the
overlay, one fetch of `/work/design-system` returns that study *plus* the home page.
But whether a given tool follows links is not something the site controls.

Meanwhile the strong material already exists in the repo — *code-first design
system, agentic AI, custom MCP, 23-person design org, 30% faster design-to-ship,
migrated the suite off Angular* — just never summarised for a machine.

This plan closes the gap **without writing new prose.** Everything is assembled from
strings already in the repo, plus three facts Arsh supplied: his city, that he's
been in product design professionally since 2021, and his education.

**The education is a bigger deal than it looks.** A BTech in Computer Science
specialising in Data Science and AI, plus an MS in Information Experience Design, is
the single strongest evidence for the "designs *and* codes, and did agentic work"
claim — and it currently appears **nowhere** on the site. It's the fact that reconciles
the two halves of the portfolio, and right now a machine has no access to it.

### Scope

| Option | This plan |
|---|---|
| 1. JSON-LD structured data | **Implement** |
| 2. Title + description rewrite | **Open issue** — Arsh writes the copy (§5) |
| 3. Retrievable summary | **Machine-readable only** — lives inside 1 and 4; no new page, no new copy |
| 4. `llms.txt` | **Implement**, generated, **full brief per study** |

---

## Plain-language: what these two things are

**JSON-LD ("structured data")** — a block of machine-readable facts in the page,
invisible to humans. A labelled index card instead of a paragraph: `name`,
`jobTitle`, `skills`, `links`, `location`. Search engines and AI tools read it to
know *who* a site is about rather than inferring it from prose. It's a
`<script type="application/ld+json">` tag and renders nothing.

**`llms.txt`** — a plain text file at `arshkaushik.com/llms.txt`. Same shape as
`robots.txt`, but where robots.txt says *"what you may crawl"*, this says *"here's
what this site is about"* — clean markdown, no nav or styling to wade through.
Honest caveat: a **proposed convention, not a standard.** Some tools read it, many
don't. But in the evaluation scenario it's the one thing that can turn a 100-word
first impression into a complete brief in a single fetch, which is why it's built
for depth here rather than as a thin index.

---

## Step 0 — Prerequisites in `src/lib/content.ts`

**A shared site URL.** `"https://arshkaushik.com"` is hardcoded in **three** places
today — `layout.tsx:24` (`metadataBase`), `sitemap.ts:7` (`const BASE`),
`robots.ts:8` (inline). Both new features need it, which would make five copies.

```ts
export const siteUrl = "https://arshkaushik.com";
```

Then use it in those three files. Unrelated-looking diff, but it stops the
duplication instead of extending it.

**The experience figure, derived so it can't go stale.**

```ts
// Arsh has been in product design professionally since June 2021. The "N+ years"
// figure is DERIVED rather than hardcoded so it can't quietly go stale — a
// portfolio still claiming "3 years" four years later is worse than silence.
export const professionalSince = 2021;
// The anniversary is 1 JUNE, not 1 January — so for Jan–May the count is one
// lower than plain year subtraction would give. Month is 0-indexed, so June = 5.
//
// UTC getters, deliberately: this runs at BUILD time, and a local build (EDT)
// and a Vercel build (UTC) sit hours apart. With local getters, building on the
// evening of 31 May in New York yields "4+" while the identical moment on Vercel
// yields "5+". UTC makes the output depend only on the instant, not the machine.
export const yearsOfExperience = (() => {
    const now = new Date();
    return (
        now.getUTCFullYear() - professionalSince - (now.getUTCMonth() < 5 ? 1 : 0)
    );
})();
export const experienceSummary = `${yearsOfExperience}+ years of experience`;
```

Two exports, not one, because the two consumers need different shapes. JSON-LD's
`description` wants the full phrase; `llms.txt` has a `Experience:` label already, and
`"Experience: 5+ years of experience"` reads badly. The bare number lets each read
naturally.

Worked examples, verified by running the expression (not eyeballed):

| Instant (UTC) | Result |
|---|---|
| 31 May 2026 23:59 | `4+ years` |
| **1 June 2026 00:00** | **`5+ years`** ← rolls over |
| Aug 2026 (today) | `5+ years` ✓ matches what Arsh stated |
| 15 Jan 2027 | `5+ years` — still 5, correctly |
| **1 June 2027 00:00** | **`6+ years`** |

> **Gotcha found while verifying this, worth recording.** The first test harness used
> `new Date("2026-06-01")` with **local** getters and reported `4+` for 1 June — which
> looked like a logic bug but was a test bug. An ISO date-only string parses as **UTC
> midnight**, which in EDT is 31 May 20:00, so local `getMonth()` returned May. Mixing
> UTC parsing with local getters is the trap. Test with explicit instants
> (`"2026-06-01T00:00:00Z"`) and UTC getters, and the two agree.

> **Known limitation, worth stating rather than hiding.** These outputs are
> **prerendered at build time**, so the string is frozen at whatever it was on the
> last deploy. If Arsh doesn't deploy between 1 June and some later date, the site
> keeps showing the previous number until he does.
>
> Deliberately not engineered around. The alternative is a `revalidate` interval,
> which would reintroduce ISR **writes** — the meter this project just spent a week
> getting off. A few weeks of "5+" instead of "6+" is a trivial inaccuracy next to
> hardcoding the number and forgetting it exists. If guaranteed freshness ever
> matters, that's a separate decision.

**Education — deliberately without dates.**

```ts
// Reverse-chronological, but with NO DATES — and that is a deliberate decision,
// not an omission to be fixed. Arsh's reasoning: recruiters tend to infer
// seniority from graduation years rather than from the work itself, so the
// education is stated as credentials and institutions only. Do not "helpfully"
// add years, and do not let a schema property (validFor, datePublished,
// startDate…) reintroduce them by the back door.
export const education = [
    {
        degree: "Master of Science",
        field: "Information Experience Design",
        institution: "Pratt Institute",
        location: "New York City",
    },
    {
        degree: "Bachelor of Technology",
        field: "Computer Science (Data Science and Artificial Intelligence)",
        institution: "SRM University",
        location: "India",
    },
];
```

---

## Step 1 — JSON-LD

### 1a. `src/lib/structured-data.ts` (new)

Builds the schema objects from existing data. Exports the two `@id` constants, a
`personRef()` helper, `siteGraph()` (Person + WebSite in one `@graph`, for the layout)
and `caseStudySchema(study)` (for a study page).

**`personSchema()`**

| Field | Source |
|---|---|
| `name` | `identity.name` |
| `jobTitle` | `identity.role` |
| `description` | `heroTagline` + `experienceSummary` |
| `url` | `siteUrl` |
| `sameAs` | `navLinks`, filtered **by URL host** to LinkedIn + GitHub |
| `email` | the `mailto:` entry in `navLinks`, prefix stripped |
| `address` | `PostalAddress` → New York, NY, US |
| `knowsAbout` | **derived** — see below |
| `alumniOf` | `education` → one `CollegeOrUniversity` each |
| `hasCredential` | `education` → one `EducationalOccupationalCredential` each |

**Why both `alumniOf` and `hasCredential`:** they do different jobs. `alumniOf` is the
widely-consumed signal — it's the property most tools actually read, and it carries
just the institution. `hasCredential` is where the degree and field of study live,
which is the part that matters here (the CS/AI + IXD combination *is* the argument).
Shape:

```
alumniOf: [
  { "@type": "CollegeOrUniversity", name: "Pratt Institute",
    address: { "@type": "PostalAddress", addressLocality: "New York", addressRegion: "NY", addressCountry: "US" } },
  { "@type": "CollegeOrUniversity", name: "SRM University",
    address: { "@type": "PostalAddress", addressCountry: "IN" } },
]

hasCredential: [
  { "@type": "EducationalOccupationalCredential",
    name: "Master of Science in Information Experience Design",
    credentialCategory: "Master's Degree",
    recognizedBy: { "@type": "CollegeOrUniversity", name: "Pratt Institute" } },
  { "@type": "EducationalOccupationalCredential",
    name: "Bachelor of Technology in Computer Science (Data Science and Artificial Intelligence)",
    credentialCategory: "Bachelor's Degree",
    recognizedBy: { "@type": "CollegeOrUniversity", name: "SRM University" } },
]
```

**No date properties on either.** `EducationalOccupationalCredential` offers
`validFor` / `validIn`, and `CreativeWork` inheritance offers `datePublished` — all
left unset on purpose. See the comment on `education` in Step 0.

`sameAs` means "a URL that unambiguously identifies this person". The Resume (Google
Drive) link is a document, not an identity, and doesn't belong there.

**Filter by URL host, not by label.** An earlier draft of this plan matched
`navLinks` on `label === "LinkedIn"` — which breaks silently the day the label is
reworded to "LinkedIn Profile", leaving `sameAs` empty with no error. Match on the
href's host containing `linkedin.com` / `github.com` instead; the label is display
copy and free to change, the host isn't. (Same failure class as `knowsAbout` below —
both derive from data that's allowed to be reworded.)

`email` is already robust: filter on `href.startsWith("mailto:")`, not on the label.

**Every string entering JSON-LD goes through `plain()`** — `heroTagline`, each
`study.deck`, the `meta` values feeding `keywords`. Not optional hygiene: `types.ts:5-8`
permits inline markdown in any of these, so a future `*emphasised*` word would
otherwise ship literal asterisks into structured data.

`description` is the one field that **composes** two of Arsh's strings, because
schema.org `Person` has no "years of experience" property. Exact composition, noting
that `heroTagline` has no terminal punctuation:

```ts
description: `${plain(heroTagline)}. ${experienceSummary}.`
// → "Solving the problem behind the stated problem through design & engineering.
//    5+ years of experience."
```

Flagged as the one spot where wording is assembled rather than quoted; trivially
reworded.

**`knowsAbout` is derived, not authored.** Each study's `meta[]` carries a `Stack`
or `Method & tools` row whose value is `·`-separated:

```
Next.js · Shadcn · Tailwind · Storybook · Custom MCP · Lucide
Contextual Inquiry · Figma · FigJam · MS Teams · Copilot (analysis)
Figma · VS Code · Copilot · Claude Code · Next.js · Shadcn · Tailwind
```

Split, flatten, dedupe. Match rows whose label starts with `Stack` **or** contains
`tools` — the label differs per study. Add a case study and the skills list updates
itself.

**`websiteSchema()`** — `WebSite` with `name`, `url`, and `author` **referencing** the
Person by `@id` (see below). It's what ties "this site" to "this person".

**`caseStudySchema(study)`** — a `CreativeWork` per study:

| Field | Source |
|---|---|
| `name` | `study.title` |
| `description` | `study.deck` — the three sentences currently rendered **nowhere** |
| `url` | `${siteUrl}/work/${study.slug}` |
| `image` | `${siteUrl}${study.thumbnail}` — **guard it, `thumbnail` is optional** |
| `keywords` | that study's Stack / Method row, `·`-split |
| `author` | `@id` reference to the Person |
| `isPartOf` | `@id` reference to the WebSite |

`image` was missing from the first draft of this plan. Each study now has a WebP
thumbnail, it costs nothing to include, and it's what lets a search or AI surface show
the work next to the description. `CaseStudy.thumbnail` is optional (`thumbnail?:`), so
omit the property rather than emit `undefined`.

### ⚠️ 1a-bis. Use `@id` references — the fix for a real bug in the first draft

As originally written, this plan would have emitted **the entire Person object three
times** on every case-study page: once standalone from `layout.tsx`, once nested inside
`WebSite.author`, and once nested inside `CreativeWork.author`. That's not just bloat —
a consumer can reasonably read three unlinked `Person` nodes as three separate people,
or as three competing descriptions of one.

The standard fix is stable `@id` anchors, with everything else pointing at them:

```jsonc
// layout.tsx — ONE script, a @graph containing both entities
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Person",  "@id": "https://arshkaushik.com/#person",  /* …all fields… */ },
    { "@type": "WebSite", "@id": "https://arshkaushik.com/#website",
      "url": "https://arshkaushik.com",
      "name": "Arsh Kaushik",
      "author": { "@id": "https://arshkaushik.com/#person" } }
  ]
}

// work/[slug]/page.tsx — a separate script, referencing the Person by @id
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "@id": "https://arshkaushik.com/work/design-system#work",
  "author": { "@id": "https://arshkaushik.com/#person" },
  /* …name, description, url, image, keywords… */
}
```

So `structured-data.ts` should export the `@id` strings as constants (`PERSON_ID`,
`WEBSITE_ID`) and a `personRef()` returning `{ "@id": PERSON_ID }`, so no builder ever
inlines the Person twice. The Person is defined exactly once per document, in the
layout, and referenced from everywhere else.

This also collapses `layout.tsx` to a **single** `<JsonLd>` call instead of two.

**Considered and declined:** `ProfilePage` with `mainEntity` → Person. It's arguably
the more precise type for a personal home page, and Google documents it — but `WebSite`
is more widely consumed, and adding a third entity type to a four-page portfolio buys
precision nobody is reading. Noting it so it reads as a choice, not an oversight.

**One helper needed.** `types.ts:5-8` documents that string fields may carry light
inline markdown (`**bold**`, `*italic*`, `[text](url)` — `companyContext` has a real
link). JSON-LD wants plain text, so add a small local `plain()` that strips emphasis
markers and reduces `[text](url)` to `text`. Can't reuse `CaseStudyDetail.tsx`'s
`renderInline` — that's module-local and returns React nodes, not a string.

### 1b. `src/components/JsonLd.tsx` (new)

```tsx
export default function JsonLd({ data }: { data: object }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data).replace(/</g, "\\u003c"),
            }}
        />
    );
}
```

**The `<` escape is required, not decorative** — without it a `</script>` inside any
string terminates the tag early. The standard JSON-LD injection hazard.

> ⚠️ **This reintroduces `dangerouslySetInnerHTML`, deliberately removed last week**
> (the inline-SVG thumbnail injection). Flagged because that removal is documented in
> `learn/vercel-isr-quota.md` and `src/lib/case-studies/types.ts`. It's unavoidable —
> React has no other way to set a `<script>` body — and unlike the thumbnail case the
> payload is our own `JSON.stringify` output, not file contents. Worth a code comment
> saying exactly that. It will also be the **first `<script>` tag in the codebase**;
> no `next/script` precedent exists to follow.

### 1c. Placement

- **`layout.tsx`** — a **single** `<JsonLd data={siteGraph()} />` (the `@graph` holding
  Person + WebSite) as the **last child of `<body>`**, after `<Analytics />`. Google
  accepts JSON-LD anywhere in the document; putting it last keeps well clear of the skip
  link, which `layout.tsx:90-94` requires to stay the first focusable element.
- **`work/[slug]/page.tsx`** — `<JsonLd data={caseStudySchema(study)} />`. Already a
  Server Component, so no boundary issue.

**Not** added to `@modal/(.)work/[slug]/page.tsx`. That route only fires on soft
navigation from a click — a human-only path. Crawlers and AI fetchers always hit the
standalone page, which is also why it's the only one with `generateMetadata`.

### 1d. What the JSON-LD will and won't contain — the "enterprise" gap

Worth auditing against the actual motivating query rather than assuming coverage.
*"A product designer who can also code and has done **enterprise agentic** work."*

Words that **will** be in the structured data:

| Concept | Where it lands |
|---|---|
| coding / engineering | `heroTagline` → `description` ("design & engineering") |
| agentic AI | `design-system` deck → `CreativeWork.description` |
| custom MCP | that deck, plus `knowsAbout` |
| Computer Science, Data Science, AI | `hasCredential` (the BTech field) |
| the toolchain | `knowsAbout` — Next.js, Figma, Claude Code, Storybook… |

The word that **will not appear anywhere**: **"enterprise."** Nor will any employer.
`worksFor` is deliberately deferred, and the only place the domain is stated is
`companyContext` — *"an enterprise data-integrity company… used by thousands of large
enterprises"* — which goes into `llms.txt` but **not** into JSON-LD.

So be clear-eyed about the division of labour:

- **JSON-LD establishes *identity*** — who this is, what they're called, where they
  studied, what tools they know, which links are them. It is the answer to *"is this
  the same Arsh Kaushik as that LinkedIn profile, and what is he?"*
- **`llms.txt` carries the *substance*** — the domain, the scope, the metrics, the
  employer context. It is the answer to *"is he any good, and has he done this kind of
  work?"*

Neither replaces the other, and the enterprise-experience claim currently rests
entirely on `llms.txt` plus the case-study pages themselves.

**Two clean ways to close it, both out of scope here:** the meta description (§5, where
keywords actually matter for search), and `worksFor` when the About page lands. Recorded
so nobody assumes JSON-LD alone made him findable for "enterprise" queries.

---

## Step 2 — `llms.txt`, built as a full brief

### `src/app/llms.txt/route.ts` (new)

Next has no `llms.txt` file convention, so this is a Route Handler — the **first one
in the repo**. Match `sitemap.ts` / `robots.ts` style: 4-space indent, a `//` block
under the imports naming the route and saying why.

```ts
export const dynamic = "force-static";

export function GET() {
    return new Response(body, {
        headers: { "content-type": "text/plain; charset=utf-8" },
    });
}
```

`force-static` matters — it prerenders at build, so no function invocation per
request. First Route Segment Config export in the repo.

**Body — assembled from existing data only:**

```markdown
# Arsh Kaushik — Product Designer

> Solving the problem behind the stated problem through design & engineering

- Experience: 5+ years in product design (professionally since 2021)
- Based in: New York, NY
- Best lift: Support tickets -50%
- Builds with: Figma + Next.js
- Ownership: End-to-end

## Selected work

### The design system that skipped Figma
A code-first design system, built and shipped with agentic AI — no Figma-to-code
handoff, governed by a custom MCP that keeps every team on-spec.

Role: Co-led — 1 of 5 designers with prior design-system context, on a 23 person design org
Team: 5 designers + 1 embedded UI engineer
Timeline: 1 month to a mature system · 2.5 months to migrate the full suite
Stack: Next.js · Shadcn · Tailwind · Storybook · Custom MCP · Lucide

Impact:
- 30% faster design-to-ship
- Design-system debt: 6 months to clear → 1 week
- Adopted org-wide
- The design↔dev validation back-and-forth disappeared

https://arshkaushik.com/work/design-system

[…the other two studies, same shape…]

## Education
- Master of Science, Information Experience Design — Pratt Institute, New York City
- Bachelor of Technology, Computer Science (Data Science and Artificial Intelligence) — SRM University, India

## Context
[Precisely](https://www.precisely.com) is an enterprise data-integrity company…
(companyContext, markdown kept as-is — this is a markdown file, so the link is valid
and useful here. Only JSON-LD needs it flattened.)

## Links
- Resume: <navLinks Resume href>
- LinkedIn: <navLinks LinkedIn href>
- GitHub: <navLinks GitHub href>
- Email: arshkaushik21@gmail.com
```

Sources: `identity`, `heroTagline`, `experienceSummary`, `stats`, `navLinks`,
`companyContext`, and each study's `title` / `deck` / `meta[]` / `impact[].lead` /
`slug`.

**Why the impact leads and not the bodies:** the leads *are* the headline metrics
("30% faster design-to-ship"), which is exactly what an evaluator needs. The bodies
are qualifying detail that belongs on the page.

**The `## Context` section is load-bearing, not decoration.** Because `worksFor` is
deliberately deferred to the future About page, `companyContext` in `llms.txt` becomes
the **only** place a machine learns who the work was for and what domain it sits in —
*"Precisely… an enterprise data-integrity company… used by thousands of large
enterprises."* For a query about *enterprise* experience, that paragraph is doing more
work than any other line in the file. Worth keeping even though it repeats across all
three studies (it's included once, at the end).

Section headings (`Selected work`, `Context`, `Links`) are structural labels, not
copy — "Selected work" is already a live heading. The only new literals anywhere are
`New York, NY` and the `since 2021` parenthetical, both supplied by Arsh. **This is
where the three unused `deck` sentences finally earn their keep.**

`next.config.ts` sets `skipTrailingSlashRedirect: true`, so `/llms.txt` won't hit a
trailing-slash redirect.

---

## Step 3 — Deliberately NOT doing

- **No new visible page.** Arsh's call: machine-readable only.
- **No per-study dates** and no `hasOccupation`. Arsh's call — the experience figure
  covers recency at the level he wants. Consequence worth naming: *"when exactly was
  this project?"* stays unanswerable from the site alone, so the resume carries that.
- **No dates on the education either — by explicit intent, not oversight.** Arsh's
  reasoning: recruiters tend to judge experience by graduation years rather than by
  the work itself. Recorded in the code comment on `education` and repeated here so a
  future pass doesn't treat it as missing data. The degrees, fields and institutions
  are all included; only the timeline is withheld.
- **No `worksFor`, no photo.** Deferred to the future About page, where the
  employment framing and a headshot will exist. One line each at that point.
- **No `robots.txt` change.** Settled separately: AI crawlers stay allowed, because
  being read and cited is the goal here.
- **`email` in JSON-LD is not new exposure** — the same `mailto:` is already a
  visible sidebar link, so it's already in the crawled HTML.

---

## Step 4 — Weight and ISR impact (stated, given the history)

This project just spent a week fixing a quota blowout caused by page size:

| | Before | After | Read units |
|---|---|---|---|
| `index.html` | 30 KB | ~32 KB | 3 → **4** |
| `work/*.html` | 45–46 KB | ~48 KB | 5 → **6** |
| `/llms.txt` | — | ~5–6 KB | **1** |

~+1.5 KB per page for Person + WebSite (education adds ~0.5 KB), ~+0.8 KB for the
per-study `CreativeWork`.
Negligible against an allowance currently running at 0.4%. Confirm by measurement,
not assumption.

---

## Step 5 — OPEN ISSUE: title and meta description (Arsh writes this)

Not implemented. Specified so it's a small change once the copy exists.

**The blocker, which is the useful part:** `heroTagline` is one string doing **five**
jobs —

| Consumer | Line |
|---|---|
| Visible hero headline | `Hero.tsx:16` |
| `<meta description>` | `layout.tsx:26` |
| `openGraph.description` | `layout.tsx:38` |
| `twitter.description` | `layout.tsx:43` |

> **Updated after the og:image swap.** This was *five* jobs when written — the fifth
> was the generated OG share card, which read `heroTagline` at
> `opengraph-image.tsx:57`. That generator has since been replaced by a designed
> static PNG (`src/app/opengraph-image.png`), so the tagline is no longer *read* from
> `content.ts` there — it's **baked into the image**. That removes one consumer but
> introduces a new gotcha: changing `heroTagline` now updates the hero and the meta
> tags but leaves the share card showing the old wording until the PNG is re-exported.

So the search-result description **cannot currently differ from the on-page
headline.** A good hero line and a good search description are different jobs
wanting different words.

**Recommended shape when the copy exists** — add distinct fields to `content.ts`:

```ts
export const metaTitle = "…";        // default: `${identity.name} | ${identity.role}`
export const metaDescription = "…";  // default: heroTagline
```

…and point `layout.tsx`'s `title` / `description` / `openGraph` / `twitter` at them,
leaving `heroTagline` to the visible hero and the OG image. One file for the copy,
one for the wiring.

**`identity.role` deserves its own decision, and the evaluation scenario raises the
stakes.** It's `"Product Designer"`, and it sets the `<title>`, the OG image *and*
the JSON-LD `jobTitle`. In discovery that's a missed keyword. In evaluation it's
worse: if an AI is checking fit against a design-engineer JD, Arsh's own title
argues against him while his case studies argue for him.

Facts already in the repo a description could draw on: enterprise data-integrity
domain (`companyContext`), design systems, agentic AI, custom MCP, Next.js /
Tailwind / Storybook, support tickets −50%, design-to-ship −30%, human errors −80%,
and now `experienceSummary`.

**This issue is load-bearing for the discovery query, per §1d.** The meta description is
the only place "enterprise" can realistically reach a *search* index, since `worksFor`
is deferred and JSON-LD carries no domain signal. So it isn't cosmetic polish — until it
lands, `llms.txt` is the sole machine-readable statement that the work was enterprise.

---

## Verification

1. `pnpm build` clean. Confirm `/llms.txt` appears in the route list as **static**,
   not `ƒ` dynamic.
2. `pnpm lint` — zero new warnings.
3. **JSON-LD parses.** Extract the script bodies from `.next/server/app/index.html`
   and `work/design-system.html` and `JSON.parse` each. **This is the check that
   matters** — malformed JSON-LD fails completely silently: nothing renders, nothing
   errors, the page looks perfect and the data is simply ignored.
4. **Validate the schema** in a browser — Google Rich Results Test and/or
   validator.schema.org against the built page source. Confirms `Person` is
   recognised and `sameAs` / `address` / `knowsAbout` / `alumniOf` / `hasCredential`
   are read. Manual; there's no local validator without adding a dependency.
5. **Confirm the Person appears exactly ONCE per document.** Count `"@type":"Person"`
   occurrences in `work/design-system.html` — it must be **1**, with the CreativeWork's
   `author` being a bare `{"@id":…}` reference. More than one means the `@id` wiring
   didn't take and the page is describing three people.
6. **Confirm `knowsAbout` is not silently empty.** The derivation matches meta rows by
   label (`Stack` / contains `tools`); if that matching breaks, the result is an empty
   array and nothing errors. Assert it contains the expected ~12 deduped entries
   including `Next.js`, `Figma`, `Custom MCP`, `Claude Code`.
7. **Confirm `image` resolves** on each CreativeWork — an absolute URL that returns 200,
   and *absent* rather than `undefined` for any study without a `thumbnail`.
8. `curl -i http://localhost:3000/llms.txt` — expect `200`,
   `content-type: text/plain; charset=utf-8`, all three studies present with
   absolute URLs, and **every impact metric present** (that's the evaluation payload).
9. **Confirm the derived experience string** resolves to `5+ years of experience`
   today, and unit-check the **1 June** boundary against fixed instants —
   `2026-05-31T23:59Z → 4+`, `2026-06-01T00:00Z → 5+`, `2027-01-15 → 5+`,
   `2027-06-01 → 6+`. An off-by-one here is silent and would misstate his experience.
   Use **UTC instants and UTC getters**; an ISO date-only string plus local getters
   gives a false failure (see the gotcha in Step 0).
10. **Confirm no education dates leaked.** Grep the built JSON-LD and `/llms.txt` for
    any 4-digit year other than the `professionalSince`-derived output — `alumniOf` and
    `hasCredential` must carry institutions, degrees and fields only. A deliberate
    constraint, so it gets an explicit check rather than an assumption.
11. **Zero visual change.** JSON-LD renders nothing, so before/after screenshots of
    `/` and `/work/design-system` at 402 / 1440 should diff to ~0. Any visible
    difference means the script tag landed somewhere it shouldn't.
12. **Skip link still first focusable** — tab once from page load on `/` and confirm
    "Skip to content" takes focus (`layout.tsx:90-94` requires this).
13. Re-measure `.next/server/app/index.html` against Step 4's estimate.
14. `graphify update .`

---

# Part 2 — What actually happened

Written after execution. The plan above survived largely intact; this half records
what was built, the reasoning behind the non-obvious choices, and the two places
where reality corrected the plan.

## What shipped

| File | Change |
|---|---|
| `src/lib/content.ts` | **+5 exports:** `siteUrl`, `location`, `professionalSince`, `yearsOfExperience`, `experienceSummary`, `education` |
| `src/lib/structured-data.ts` | **new** — builds the schema.org objects from the content modules |
| `src/components/JsonLd.tsx` | **new** — renders a JSON-LD `<script>`; the only `<script>` in the codebase |
| `src/app/llms.txt/route.ts` | **new** — the first Route Handler in the repo |
| `src/app/layout.tsx` | uses `siteUrl`; renders `<JsonLd data={siteGraph()} />` last in `<body>` |
| `src/app/work/[slug]/page.tsx` | renders `<JsonLd data={caseStudySchema(study)} />` |
| `src/app/sitemap.ts`, `src/app/robots.ts` | use `siteUrl` instead of their own hardcoded copies |

Zero new dependencies. Zero authored prose — every string is quoted from the content
modules or derived from them, except one deliberately composed sentence (below).

## The design decisions that matter

### 1. `@id` references, so the Person exists exactly once per document

The first draft of the plan would have emitted **the whole Person object three
times** on a case-study page: once from the layout, once nested in `WebSite.author`,
once nested in `CreativeWork.author`. That's not merely wasteful — a consumer can
reasonably read three unlinked `Person` nodes as three different people, or as three
competing descriptions of one, which is worse than having no structured data at all.

The fix is stable `@id` anchors exported from `structured-data.ts`:

```ts
export const PERSON_ID  = `${siteUrl}/#person`;
export const WEBSITE_ID = `${siteUrl}/#website`;
const personRef  = { "@id": PERSON_ID };
const websiteRef = { "@id": WEBSITE_ID };
```

The layout emits one `@graph` holding Person + WebSite. Everything else points at
those ids. Verified: `"@type":"Person"` occurs **exactly once** in
`work/design-system.html`, and the CreativeWork's `author` is a bare
`{"@id":"…/#person"}`.

### 2. Derive, don't duplicate

`knowsAbout` is not a hand-written list. It's assembled from each study's `Stack` or
`Method & tools` meta row (`·`-separated), flattened and deduped — **14 entries** with
no second list to maintain. Add a case study and the skills list grows by itself.

Same principle throughout: `sameAs` from `navLinks`, `email` from the `mailto:` entry,
`CreativeWork.description` from `study.deck`, `keywords` from that study's stack row.

### 3. Match on hosts and prefixes, never on labels

`sameAs` filters `navLinks` by **URL host** (`linkedin.com`, `github.com`), not by
`label === "LinkedIn"`. Labels are display copy and free to be reworded; the day
"LinkedIn" becomes "LinkedIn Profile" a label match would silently produce an empty
`sameAs` with no error anywhere. Hosts don't move. `email` matches
`href.startsWith("mailto:")` for the same reason.

`knowsAbout` is the one place that *does* still depend on label text (`Stack` /
contains `tools`), because there's nothing else to key on. Its failure mode is a
silent empty array, so it gets an explicit assertion in verification rather than
trust.

### 4. Everything goes through `plain()`

`types.ts` permits light inline markdown in any content string, and `companyContext`
contains a real `[Precisely](url)` link. Structured data wants plain text, so every
string entering it is stripped of `**bold**`, `*italic*` and markdown links. Without
this, a future emphasised word would ship literal asterisks into the schema.

`llms.txt` deliberately does **not** strip markdown — it *is* a markdown file, so the
Precisely link renders correctly there.

### 5. The one composed sentence

Every other value is quoted verbatim. `Person.description` is the exception, because
schema.org has no "years of experience" property:

```ts
description: `${plain(heroTagline)}. ${experienceSummary}.`
// → "Solving the problem behind the stated problem through design & engineering.
//    5+ years of experience."
```

The explicit period matters — `heroTagline` carries no terminal punctuation.

### 6. Experience derived from a start year, rolling over on 1 June

```ts
export const professionalSince = 2021;
export const yearsOfExperience = (() => {
    const now = new Date();
    return now.getUTCFullYear() - professionalSince - (now.getUTCMonth() < 5 ? 1 : 0);
})();
```

Derived rather than hardcoded so it can't go stale — a portfolio still claiming "3
years" four years later is worse than saying nothing. Anniversary is **1 June**, not
1 January, hence the month adjustment (month is 0-indexed, so June = 5).

**UTC getters, deliberately.** This runs at build time, and a local build (EDT) sits
four hours from a Vercel build (UTC). With local getters, building on the evening of
31 May in New York emits `4+` while the identical instant on Vercel emits `5+`. UTC
makes the output depend on the instant, not the machine.

Verified against fixed instants: `2026-05-31T23:59Z → 4+`,
`2026-06-01T00:00Z → 5+`, `2027-01-15 → 5+`, `2027-06-01 → 6+`.

> **A gotcha that cost a false alarm.** The first test harness used
> `new Date("2026-06-01")` with **local** getters and reported `4+` for 1 June, which
> looked like an off-by-one in the logic. It was a bug in the *test*: an ISO
> date-only string parses as **UTC midnight**, which in EDT is 31 May 20:00, so local
> `getMonth()` returned May. Mixing UTC parsing with local getters is the trap. Test
> with explicit instants and UTC getters and the two agree.

**Known limitation, not engineered around:** these outputs are prerendered, so the
value freezes at the last deploy. It refreshes on the first build after 1 June, not
on 1 June itself. The alternative is a `revalidate` interval, which reintroduces ISR
**writes** — the meter this project spent a week getting off
(`learn/vercel-isr-quota.md`). A few weeks of `5+` instead of `6+` is a trivial
inaccuracy next to hardcoding a number and forgetting it exists.

### 7. Education without dates — deliberate, and defended in three places

Both degrees are included with field of study and institution. **No dates anywhere.**
Arsh's reasoning: recruiters tend to infer seniority from graduation years rather than
from the work itself.

Because an absent date reads as missing data to whoever comes next, the decision is
guarded rather than merely implied:

1. A comment on the `education` constant stating it's deliberate and naming the schema
   properties that could smuggle dates back in (`validFor`, `validIn`,
   `datePublished`, `startDate`).
2. A note in this document.
3. A verification step grepping the built output for stray 4-digit years.

Modelled with **both** `alumniOf` and `hasCredential`, because they do different jobs:
`alumniOf` is the widely-consumed signal and carries only the institution;
`hasCredential` is where the degree and field live — and the field is the point here.
*Computer Science (Data Science and Artificial Intelligence)* plus *Information
Experience Design* is the strongest single piece of evidence for the "designs **and**
codes" claim, and it had appeared nowhere on the site before this change.

### 8. `llms.txt` as a full brief, not an index

The home page carries **142 visible words**, ~40 of which are the nav rendered twice
(Sidebar and MobileNavPill are both in the DOM, one hidden by CSS). An AI that fetches
one URL and doesn't follow links is assessing Arsh on about a hundred words.

So the file is built for depth: per study, the title, the `deck` sentence, every meta
row (Role / Team / Timeline / Stack) and **all** impact metrics — then education,
company context and links. **3,162 bytes, one ISR read unit.**

`force-static` on the route prerenders it at build, so it costs no function invocation
per request.

**The `## Context` section is load-bearing.** Because `Person.worksFor` is deferred to
a future About page, `companyContext` is the *only* place a machine learns the work was
for "an enterprise data-integrity company… used by thousands of large enterprises."
For any query about **enterprise** experience, that paragraph does more work than
anything else in the file.

## Where reality corrected the plan

### The size estimate was wrong, for a reason I'd just documented

The plan predicted **+2 KB** per page. Actual: **+6 KB**.

| | Before | After | Read units |
|---|---|---|---|
| `index.html` | 30 KB | **36 KB** | 3 → **4** |
| `work/design-system.html` | 46 KB | **53 KB** | 5 → **6** |
| `work/connector-config.html` | 46 KB | **53 KB** | 5 → **6** |
| `/llms.txt` | — | **3 KB** | **1** |

Measuring the cause: the rendered `<script>` tags are only **1.7 KB** on the home page
— but the string `Information Experience Design` appears **three times** in the
document while `"@type":"Person"` appears once. Two of those three live in the RSC
flight payload.

**This is the exact doubling mechanism `learn/vercel-isr-quota.md` was written about,
applying again to a different payload.** Anything placed in server-rendered HTML gets
multiplied by the hydration data. Having just spent a week on that lesson, the estimate
still ignored it.

The read-unit outcome matched the prediction (3→4, 5→6) because 8 KB blocks are coarse,
so the impact is as planned — but the lesson generalises past thumbnails, and the plan
should have applied it.

### A cosmetic artifact worth knowing about, left alone

`knowsAbout` contains both `"Copilot (analysis)"` and `"Copilot"`. They're the same
tool, phrased differently in two studies — connector-config used Copilot for analysis,
command-line for code. Dedupe is by exact string, so both survive.

Not fixed, deliberately. Stripping trailing parentheticals would merge them and read
better as a skills list, but it edits the meaning of Arsh's own data. Flagged rather
than silently normalised; a one-line change if he wants it.

## What this deliberately does NOT claim

Audited against the query that motivated the work — *"a product designer who can also
code and has done **enterprise agentic** work"*:

| Concept | Where it lands |
|---|---|
| coding / engineering | `Person.description` ("design & engineering") |
| agentic AI, custom MCP | the design-system `deck` → `CreativeWork.description` |
| Computer Science, Data Science, AI | `hasCredential` |
| the toolchain | `knowsAbout`, 14 entries |

**The word "enterprise" appears nowhere in the JSON-LD**, and neither does any
employer. So be clear about the division of labour:

- **JSON-LD establishes *identity*** — who this is, what they're called, where they
  studied, what they know, which links are them.
- **`llms.txt` carries the *substance*** — domain, scope, metrics, employer context.

The enterprise-experience claim rests entirely on `llms.txt` and the case-study pages.
Two clean ways to close it, both out of scope here: the meta description (below), and
`Person.worksFor` when the About page lands.

## Verification results

| # | Check | Result |
|---|---|---|
| 1 | `pnpm build` | clean; `/llms.txt` listed as `○ (Static)` |
| 2 | `pnpm lint` | zero warnings |
| 3 | JSON-LD parses | both pages, every block `JSON.parse`d — the check that matters, since malformed JSON-LD fails **silently** |
| 4 | Schema validators | *manual, outstanding* — see below |
| 5 | Person appears once | **1** per document, `author` is a bare `@id` ref |
| 6 | `knowsAbout` not empty | **14** entries incl. Next.js, Figma, Custom MCP, Claude Code |
| 7 | `image` resolves | absolute URL per study, omitted when `thumbnail` unset |
| 8 | `/llms.txt` | `200`, `text/plain; charset=utf-8`, 3/3 studies, 3/3 absolute URLs, **10/10 impact leads** |
| 9 | Experience + 1 June boundary | `5+ years`; all four fixed instants correct |
| 10 | No education dates leaked | `llms.txt`: only `2021`. **JSON-LD: no years at all** |
| 11 | Zero visual change | 4 full-page screenshots, `max Δ 0`, **0 pixels differing** |
| 12 | Skip link first focusable | first Tab → `<a href="#content">Skip to content</a>` |
| 13 | Size delta | see above — estimate corrected |

**Outstanding:** step 4, validating with Google Rich Results Test / validator.schema.org.
That requires pasting built page source into a browser tool and can't be done locally
without adding a dependency. Everything mechanical passes; the remaining risk is a
schema-semantics mistake a validator would catch.

## Still open

**Title and meta description** — not implemented; Arsh writes the copy.

The blocker is the useful part: `heroTagline` is **one string doing four jobs** — the
visible hero headline (`Hero.tsx:16`), `<meta description>`, `openGraph.description`
and `twitter.description`. So the search-result description **cannot currently differ
from the on-page headline**, and a good hero line and a good search description want
different words.

A fifth consumer, the generated OG share card, was removed when that card became a
designed static PNG — but the tagline is baked into that image, so rewording
`heroTagline` also means re-exporting `src/app/opengraph-image.png` to match.

Recommended shape: add `metaTitle` / `metaDescription` to `content.ts`, point
`layout.tsx` at them, and leave `heroTagline` to the hero and the OG image.

`identity.role` deserves its own decision. It's `"Product Designer"` and it sets the
`<title>`, the OG image **and** the JSON-LD `jobTitle` — the one string that never
mentions that he codes. In discovery that's a missed keyword; in evaluation it's worse,
because an AI checking fit against a design-engineer role finds his own title arguing
against him while his case studies argue for him.

Per the audit above, the meta description is also the only realistic route for
"enterprise" to reach a search index until `worksFor` exists. It isn't cosmetic polish.
