import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reverse-proxies PostHog through this site's own domain (/ingest/*)
  // instead of calling us.i.posthog.com directly. Ad-blockers/privacy
  // extensions commonly block requests to known analytics domains but leave
  // same-origin traffic alone — this is PostHog's own recommended setup for
  // more reliable data collection. The three rules mirror PostHog's exact
  // documented proxy config for US Cloud: static assets, the recorder/replay
  // "array" bundle, and the catch-all event/decide traffic — in that specific
  // order, since the catch-all would otherwise shadow the two more specific
  // rules above it.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // Required alongside the rewrites above: PostHog's API relies on trailing
  // slashes on some endpoints (e.g. /e/), which Next would otherwise redirect
  // away before the rewrite ever sees the request.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
