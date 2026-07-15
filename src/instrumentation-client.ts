import posthog from "posthog-js";

// PostHog: events/pageviews + (for now) session replay and heatmaps too —
// deliberately left enabled alongside Clarity's, so both tools can be
// compared side by side before deciding which one to keep long-term. Neither
// is disabled here; whatever's toggled on in the PostHog project's own
// Settings -> Recordings/Heatmaps controls that, not this init call.
//
// `instrumentation-client.ts` (this exact filename, sibling to src/app/) is
// Next.js's own convention for client-side instrumentation — it loads
// automatically before the rest of the app, no provider/component needed
// (unlike Clarity, which had to be a mounted component since Clarity's SDK
// has no equivalent standalone entry point).
//
// api_host is `/ingest`, a relative path on this SAME domain, not PostHog's
// real host — see next.config.ts's rewrites() for the reverse proxy this
// depends on, and the comment on NEXT_PUBLIC_POSTHOG_HOST in .env.local.
// ui_host is separate: it's only used to point the in-app toolbar/links back
// at PostHog's real UI, since api_host itself no longer is a real posthog.com
// URL once proxied.
//
// Gated to production only, matching Clarity: local `pnpm dev` sessions
// shouldn't count as real visitor data.
if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        ui_host: "https://us.posthog.com",
        defaults: "2026-05-30",
        // This site runs no PostHog surveys, but by default posthog-js still
        // downloads the surveys module (~32KB, measured 82% unused by
        // Lighthouse) on every visit. Opting out skips that request entirely;
        // events, pageviews, and session replay are unaffected. Delete this
        // line if a survey is ever created in the PostHog dashboard.
        disable_surveys: true,
    });
}
