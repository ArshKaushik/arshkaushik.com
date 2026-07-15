# 04 — Post-Fix Assessment: Speed & Lighthouse

**What was run (2026-07-15):** a fresh production build (`pnpm build`, 12/12 pages) served locally via `next start` on port 3010, audited with **real Lighthouse runs** (npx lighthouse, headless Chrome) — home and `/work/design-system` under the default mobile emulation (simulated slow-4G + 4× CPU throttle), plus home under the desktop preset. Analytics keys were present from `.env.local`, so PostHog/Clarity/Vercel-Analytics behavior in the audit matches production. Your own dev server on port 3000 was left untouched.

## Verdict

**The site is fast, and it passes Lighthouse.** Performance is green on every run — including a perfect 100 on desktop — and Accessibility/SEO are 100 everywhere, which directly validates the round-1 and round-2 fix work. The one non-green category is **Best Practices (73)**, and every point of that deduction traces to the analytics stack you explicitly deferred deciding on (finding 8 in `01-1`), plus one local-environment artifact that won't exist in production.

## Scores (actual Lighthouse output)

| Run | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Home — mobile emulation | **92** | **100** | 73 | **100** |
| /work/design-system — mobile | **94** | **100** | 73 | **100** |
| Home — desktop preset | **100** | **100** | 73 | **100** |

| Core metric | Home mobile | Work mobile | Home desktop | "Good" threshold |
|---|---|---|---|---|
| First Contentful Paint | 0.8 s | 0.8 s | 0.2 s | ≤1.8 s ✅ |
| Largest Contentful Paint | 3.3 s | 3.0 s | 0.6 s | ≤2.5 s ⚠️ mobile |
| Total Blocking Time | 80 ms | 80 ms | 0 ms | ≤200 ms ✅ |
| Cumulative Layout Shift | **0** | **0** | **0** | ≤0.1 ✅ |

For scale: before the round-1 fixes this page was 3.7 MB of gzipped HTML — these runs measure the fixed site (5.7 KB gzipped HTML, images as 12–18 KB optimized variants).

## What the audit validates (pass list, with the fix that earned it)

- **Accessibility 100 on every page** — the inert modal/focus containment, collapsed-pill `inert`, heading outline, skip link, keyboard reveals, and dialog semantics all hold up under axe's automated checks.
- **SEO 100** — metadataBase, OG/Twitter tags, per-study metadata, sitemap, robots.
- **CLS = 0 on every run** — the aspect-ratio'd image slots and the scrollbar-width scroll-lock compensation are doing their job.
- **Image pipeline works end-to-end** — Lighthouse's mobile viewport received 640px variants at 12–18 KB each, first-card image request started at 25 ms (the `priority` preload), fonts preloaded at 23 ms (29 KB + 15 KB woff2).
- **Routes behave** — `/work/bogus` returns a real HTTP 404 with the branded page; `/sitemap.xml`, `/robots.txt`, and both `opengraph-image` routes return 200.
- **Code health unchanged** — `pnpm build` / `pnpm lint` / `tsc --noEmit` all clean across the 22-file diff (311 insertions, 2,352 deletions vs `main`); no regressions found re-reviewing the changed files.

---

## New findings

### N1 — Best Practices capped at 73 by Microsoft Clarity's third-party cookies — Medium, P1 (decision), P0 (effort once decided)

**Claim:** the entire meaningful Best-Practices deduction is Clarity.
**Evidence:** the failing audits and their category weights: `third-party-cookies` (score 0, **weight 5**) — 8 cookies: `MUID`, `MUID`, `MR`, `MR`, `ANONCHK`, `SM`, `CLID`, `SRM_B`, all set by `clarity.ms` / Bing domains; `inspector-issues` (score 0, weight 1) — cookie-deprecation warnings, again citing `https://www.clarity.ms/tag/xlkdqso395` and `scripts.clarity.ms/0.8.67/clarity.js`. Identical on both audited pages.
**Reasoning:** unlike PostHog (which you reverse-proxy through `/ingest`, making it first-party), Clarity's script and cookies come straight from Microsoft's domains and can't be proxied the same way — the cookies are inherent to how Clarity works. This will score exactly the same on production. Chrome's UI increasingly flags third-party cookies, so this is also what a technically-savvy reviewer sees in DevTools.
**Recommendation:** fold this into the already-deferred analytics decision (01-1 finding 8) — it adds a measured number to that choice: **keeping Clarity costs ~25 Best-Practices points; ending the comparison in PostHog's favor takes the category to ~green with zero other work.** If you keep Clarity long-term, the honest options are accepting the score or running Clarity in consent-gated mode (which throttles the very recordings you keep it for).

### N2 — PostHog loads a surveys module you don't use — Low, P2 — ✅ **FIXED** (same day)

**Claim:** every visitor downloads PostHog subresources that do nothing on this site.
**Evidence (original audit):** `unused-javascript` audit (score 0, est. 115 KiB savings): the PostHog-containing main chunk (62 KiB unused of 139 KiB), `posthog-recorder.js` (27 KiB unused of 53 KiB), and **`surveys.js` — 26 KiB unused of 32 KiB (~82% unused)**. `legacy-javascript` flags the same PostHog files (~50 KiB of pre-ES2017 polyfill code).
**Reasoning:** the recorder is intentional (your replay comparison), but the surveys module loads because PostHog auto-loads it unless told otherwise — you run no surveys.

**Fix applied:** `disable_surveys: true` added to the `posthog.init(...)` options in `src/instrumentation-client.ts` (with a comment noting to delete the line if a survey is ever created in the PostHog dashboard). Events, pageviews, and session replay — including the Clarity-vs-PostHog comparison — are unaffected.
**Verification (re-audit, home/mobile, 2026-07-15):** the `surveys.js` network request is **gone** from the Lighthouse network log, and the `unused-javascript` estimate dropped **115 KiB → 90 KiB**. Scores unchanged as expected (Performance 92, Accessibility 100, Best Practices 73, SEO 100; LCP 3.1 s, CLS 0 — metric wobble vs the first run is normal run-to-run variance). Build/lint/`tsc --noEmit` all clean after the change. The remaining 90 KiB of unused JS is the PostHog core chunk + recorder — that's the deferred finding 8 (lazy-init / vendor decision), not this fix.

### N3 — Mobile LCP is 3.0–3.3 s, above the 2.5 s "good" line — Low, P2

**Claim:** under Lighthouse's simulated slow-4G + 4× CPU mobile profile, LCP lands in the "needs improvement" band (while the desktop preset measures 0.6 s).
**Evidence:** metric table above; contributing diagnostics from the report: one render-blocking stylesheet (`render-blocking-insight`: est. 130–186 ms), plus network contention from the analytics chain during load (`/ingest/*` config/flags/recorder requests and `clarity.js` interleave with page resources from 126 ms onward). The controllables are already right: fonts preloaded at 23 ms, LCP-candidate image preloaded at 25 ms with `priority`, CLS 0.
**Reasoning:** with HTML at 5.7 KB and assets preloaded, the remaining LCP cost is the simulated critical chain (HTML → CSS → paint under 4× CPU) plus third-party contention — there is no single self-inflicted mistake left to remove. Production on Vercel's CDN (with brotli + HTTP/2 priorities + edge latency) will typically measure somewhat better than localhost; the score (92–94) is already passing.
**Recommendation:** treat as a monitor-not-fix item. The one real lever is the same analytics decision as N1/N2 (fewer/later third-party requests during load). Check real-user numbers in Vercel Analytics' Web Vitals after deploy before spending any more effort here.

### N4 — Local-only console 404: `/_vercel/insights/script.js` — Info, no action

**Claim:** the `errors-in-console` failure (weight 1) is an artifact of auditing off-Vercel.
**Evidence:** the single console error is `Failed to load resource: 404` for `http://localhost:3010/_vercel/insights/script.js` — the script `@vercel/analytics` injects, which is served by Vercel's infrastructure and therefore doesn't exist under plain `next start`.
**Reasoning:** on arshkaushik.com (deployed on Vercel) this resolves and the audit passes; locally it's expected noise. It cost ~2 points of Best Practices in these runs.
**Recommendation:** none needed. Optionally confirm by running Lighthouse (or PageSpeed Insights) against the live production URL after the next deploy — production Best Practices should read ~76–78 with Clarity, ~100 without it.

---

## Bottom line

| Question asked | Answer |
|---|---|
| Is the site fast? | **Yes** — 5.7 KB HTML, 0.8 s FCP on throttled mobile, 0.6 s LCP on desktop, zero layout shift. |
| Does it pass Lighthouse? | **Yes** — Performance 92/94/100, Accessibility 100, SEO 100. Best Practices 73 is the exception, and it is entirely an analytics-stack cost you've consciously parked, not a defect in the site itself. |
| Anything new to fix? | N2 (`disable_surveys: true`) — **applied and verified same day** (surveys.js request gone, unused JS 115→90 KiB). Remaining: one number to carry into the pending analytics decision (N1: Clarity ≈ −25 Best-Practices points); one metric to watch in real-user data after deploy (N3); one non-issue explained (N4). |

Raw reports (JSON) are in the session scratchpad (`lh-home-mobile.json`, `lh-work-mobile.json`, `lh-home-desktop.json`, and `lh-home-mobile-v2.json` from the post-N2-fix re-audit) if you want to load them into the Lighthouse viewer.
