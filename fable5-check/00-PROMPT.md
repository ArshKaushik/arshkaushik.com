# Fable 5 Review Brief — arshkaushik.com

> **How to run this:** In a fresh Claude Code session, switch the model with `/model` → **Fable 5** (`claude-fable-5`), set `/effort xhigh` (or `high`), confirm you're on branch `v1.1-fable5-exp`, then paste everything below the divider as your first message.
>
> **Inputs already in place:** `arsh-kaushik-resume.pdf` and `linkedin-profile.pdf` are in the repo root. The three analysis files will be written next to this brief, inside `fable5-check/`.
>
> A rigorous audit at `xhigh` can run for many minutes in a single turn — that's expected, not a hang.

---

You are performing a rigorous, evidence-based review of my personal portfolio site. You are running inside Claude Code on the branch `v1.1-fable5-exp` (a sandbox branched off `main` specifically for this review). Work autonomously and thoroughly.

## Who I am and why this matters (read this first — it shapes everything)
I'm Arsh Kaushik, a product designer with a CS background and prior software-dev experience. This repo (arshkaushik.com) is my portfolio. I've been working in design since 2021.

I need three things from you, and I need to trust the output:
1. A hard engineering review of the site (bugs, performance, code quality) so I know what to fix.
2. A product-design review of the motion, interaction, and UI craft so I know how it actually feels and where it falls short.
3. An honest read on how strong a candidate I am for a SENIOR product designer role in the 2026 job market — assessed through the eyes of the people who actually gate these roles.

Target roles: early-stage startups (founding / early product designer) AND scale-ups / big-tech product orgs (leveled PD ladders). Not agencies. Assess my readiness for both, and call out where I skew stronger or weaker.

Tone for all findings: brutally honest, no sugar-coating. But every single point — positive OR negative — must include the reasoning, rationale, and evidence behind it. A verdict without a "because…" backed by something concrete is not acceptable.

## Portfolio philosophy — intentional compression (calibrate against this, in files 2 AND 3)
The portfolio's depth is intentionally compressed. Based on feedback from real design recruiters and senior design leaders — initial screening happens in seconds, and reviewers don't read deep process at the triage stage — I deliberately kept case studies to high-signal key points (the problem, key details, the hardest call on the project, and what I did) rather than long process/research write-ups. Do NOT treat the absence of detailed process/research as a weakness, and do NOT ding the portfolio for it anywhere in files 2 or 3. Instead, assess judgment from these compressed signals — especially whether each "hardest call" demonstrates genuinely senior-level judgment (real stakes, a non-obvious tradeoff, sound reasoning) — plus resume scope. Where deeper rigor would genuinely matter (a senior portfolio deep-dive or a "walk me through this" interview), raise it as an interview-readiness point, NOT a portfolio flaw.

## The stack and where things live (so you don't waste time discovering it)
- Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript, pnpm.
- NO animation library — all motion is pure CSS / Tailwind (transitions, keyframes, transforms). Analyze it from the code.
- Analytics: Vercel Analytics, PostHog, Microsoft Clarity.
- Key areas: `src/app/` (home `page.tsx`, `work/[slug]/page.tsx`, and the intercepting-route modal at `src/app/@modal/(.)work/[slug]/page.tsx`), `src/components/{sections,case-study,ui}`, `src/lib/content.ts`, `src/lib/case-studies/*`.
- A graphify knowledge graph exists at `graphify-out/`. Use `graphify query "<question>"`, `graphify path "<A>" "<B>"`, and `graphify explain "<concept>"` for navigation before falling back to grep/glob. Do NOT run `graphify update` (you are not changing code).
- Recent bug fixes worth verifying for regressions: a "no-way-back-home" navigation bug, refresh-mid-case-study matching the overlay state, and an inline-SVG `fs` import that was leaking into a client bundle. Confirm these areas are actually sound.
- The site is currently DESKTOP-FIRST by design; full responsiveness is deliberately deferred. Assess breakpoint/responsive behavior honestly, but frame the gaps as current-state + risk, not as critical bugs — and do tell me how mobile-ready it needs to be for a 2026 portfolio.

## Operating rules (do not violate these)
- READ-ONLY on the portfolio. Do NOT edit, refactor, fix, reformat, or delete any source/config file. The ONLY files you may write are the three reports inside the `fable5-check/` folder.
- The `fable5-check/` folder already exists and already contains this brief as `00-PROMPT.md` — leave that file untouched. Write your three reports alongside it.
- Do NOT commit, push, create branches, stage changes, or otherwise alter git state.
- You MAY run read-only and build commands: `pnpm install` (if needed), `pnpm dev`, `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, and read-only git commands (`git log`, `git diff main`). Report their ACTUAL output — never paraphrase results you didn't observe.
- There is no browser automation available. Do NOT claim to have visually observed animations or rendered pages. Base motion/UX findings on the code plus what the dev/build output reveals, and collect anything that genuinely needs a human to look at it into an explicit "Needs Arsh's visual QA" list in file 2.
- Work autonomously. Don't stop to ask permission for reversible, read-only analysis — just do it.
- Before you write any finding, confirm it against a real tool result (a file:line you actually read, or command output you actually saw). If you can't verify something, say so explicitly rather than asserting it.
- Don't overplan. Once you have enough to act, act. Don't narrate options you won't pursue.
- You may spawn parallel subagents for independent workstreams (e.g., code review vs. motion/UX vs. candidate assessment) if it helps — but you own consolidating and verifying their findings before writing.

## Candidate materials (needed for file 3 — already provided in the repo root)
- Resume: read `arsh-kaushik-resume.pdf` in the repo root (the file reader handles PDFs).
- LinkedIn: read `linkedin-profile.pdf` in the repo root.
- Both files are present. If either is unexpectedly unreadable, tell me rather than fabricating or guessing its contents — do not attempt a live LinkedIn fetch (it is blocked by anti-bot measures). Finish files 1 and 2 first regardless, then use both documents for file 3.

## Deliverables — create exactly these three files in `fable5-check/`

The "Cover" lists in each file below are scope and success criteria — NOT an ordered procedure. Plan your own approach and investigate in whatever order is efficient; the goal is thorough, evidence-backed coverage, not following a script.

Shared output contract for ALL files:
- Start with an Executive Summary that leads with the verdict/outcome, then a prioritized findings table.
- Every finding = Claim → Evidence (file:line or command output) → Reasoning/rationale (why it matters) → Severity or Priority → Recommendation (describe the fix; do not apply it).
- Use a severity scale for files 1–2: Critical / High / Medium / Low. Use P0/P1/P2 for recommendations.
- Be specific and scannable. No filler. If something is good, say why it's good with the same evidentiary rigor as the criticisms.

### `fable5-check/01-code-review.md` — Engineering & performance
Cover (plan your own order):
- Correctness & bugs: logic/edge cases, routing and the intercepting-route modal behavior (open/close, deep-link, refresh, back nav), `generateStaticParams`/`generateMetadata`, hydration mismatches, Next 16 / React 19 pitfalls, broken/incorrect links, server-vs-client component boundaries and any `'use client'` misuse, server-only imports leaking into client bundles.
- Performance & speed: bundle/JS shipped, LCP/CLS/INP risks, image handling (are `public/thumbnails` served optimally? is next/image used?), font loading, render-blocking or privacy-heavy analytics (Vercel/PostHog/Clarity), unnecessary re-renders or client work.
- Code quality & health: structure, typing, dead code, duplication, naming, error/empty/loading states, config (`next.config.ts`, `eslint.config.mjs`, `tsconfig.json`), and basic security hygiene (external `rel="noopener"`, env handling in `.env.local`).
- Build health: run `pnpm build`, `pnpm lint`, `npx tsc --noEmit`; report real results.

### `fable5-check/02-ux-motion-design-review.md` — Motion, interaction & UI/product craft
Cover:
- Animations & transitions: enumerate EVERY animation/transition in the codebase (CSS keyframes, Tailwind transition utilities, the case-study card→overlay/modal→detail choreography, hover/focus states, scroll behaviors). For each: duration, easing, what property animates (flag layout-triggering props vs. transform/opacity), jank/reflow risk, entrance/exit coherence, and `prefers-reduced-motion` support.
- Breakpoints & responsiveness: map the Tailwind breakpoint usage and assess behavior from mobile→desktop, calibrated to the desktop-first intent noted above.
- UX & interaction: navigation, information architecture, the case-study flow end to end, affordances/feedback, keyboard navigation, focus management, and accessibility (contrast, focus rings, semantic HTML, alt text, reduced motion).
- UI & product-design craft: visual hierarchy, typography, spacing/rhythm, color, consistency, polish, and microcopy/content design.
- End with a "Needs Arsh's visual QA" checklist of items you couldn't verify without seeing it render.

### `fable5-check/03-candidate-assessment.md` — Portfolio + resume + LinkedIn, through the people who gate senior PD roles
Base this on the portfolio's actual content (case studies, hero, about, footer, `content.ts`) AND the resume AND the LinkedIn profile.
- CRITICAL framing: count my ENTIRE design experience since 2021 — internships, freelance, contract, and substantial side projects are all legitimate experience, not just full-time roles. Assess seniority readiness against total years, trajectory, and scope of impact.
- Consistency audit: do the portfolio, resume, and LinkedIn tell ONE coherent story (titles, dates, scope, seniority claim)? Flag every inconsistency — recruiters catch these and they read as red flags.
- Assess through four distinct lenses, each its own section, each giving a verdict + reasoning + evidence:
  1. Recruiter / talent partner — LinkedIn is typically their FIRST touchpoint (often before the portfolio) and their search surface. Assess the 30–90s scan across LinkedIn + resume: is my level legible, would I surface in a "senior product designer" search (keywords/searchability), is the headline/About/experience framing strong, is there social proof (recommendations), any red flags, would they forward me to a hiring manager?
  2. Head of Design / design leader — craft bar, strategic thinking, range, seniority signals, growth trajectory, team fit.
  3. Senior Product Designer (peer interviewer) — depth of craft, problem framing, judgment, systems thinking, and how the work would hold up in a "walk me through this" deep-dive; "would I want them on my team?" (Per the compression note, treat process-depth gaps as interview-readiness, not portfolio flaws.)
  4. Startup co-founder hiring a FOUNDING product designer — ownership, comfort with ambiguity, velocity, business sense, 0→1 and end-to-end range.
- Give separate readiness reads for (a) early-stage startups and (b) scale-ups/big tech, since the bars differ.
- Anchor to the 2026 senior-PD market: what the bar actually is now (AI/tooling fluency, systems, measurable business impact, storytelling), and how competitive I am against it.
- Deliver a **scorecard** across these 6 dimensions, each rated with evidence + rationale:
  1. **Visual & interaction craft**
  2. **Product thinking & judgment** — problem framing, user + business tradeoffs, and the quality of the "hardest call" decisions. Per the intentional-compression note above, judge this from the compressed case-study signals and resume scope — never from the absence of process write-ups.
  3. **Impact & outcomes**
  4. **Range & autonomy (0→1, end-to-end)**
  5. **Storytelling & communication** — portfolio, resume, and LinkedIn as artifacts
  6. **Technical & AI/tooling fluency** — the 2026 differentiator
  Rate each dimension with a LEVEL BAND, not a number: 🔴 Below bar (reads junior/mid) · 🟡 Approaching (senior signals, but thin or inconsistent) · 🟢 At bar (meets the 2026 senior-PD expectation) · 🔵 Above bar (differentiator, staff-leaning). Do NOT produce a single blended/composite score — it is false precision and flattens the picture.
- **Seniority synthesis:** does the whole package read junior / mid / senior / staff-leaning, and why? Assess leadership & influence here (mentorship, driving direction, cross-functional influence) as the mid→senior separator.
- **Two market readiness verdicts**, since the bar differs — each a band + rationale + the 1–2 dimensions dragging it down:
  - Early-stage startups — weight range/autonomy, impact, and product thinking/judgment most heavily.
  - Scale-ups / big tech — weight craft depth, judgment rigor, technical/systems fluency, and leadership at higher levels.
- **Per-persona verdict** (advance / borderline / pass, with why) for each of the four lenses above.
- **Biggest strengths**; **biggest gaps and concrete rejection risks.**
- A **P0/P1/P2 prioritized action list** to strengthen my candidacy (portfolio, resume, LinkedIn, positioning, skills).

## Definition of done
All three files exist in `fable5-check/`, each finding is evidence-backed with explicit reasoning, `pnpm build`/`pnpm lint`/`tsc` were actually run and their real results reported, the resume and LinkedIn were read, and no portfolio/source files or git state were modified. Finish with a short summary message: the three headline verdicts (code health, UX/motion craft, candidate strength) and the single highest-priority action from each file.
