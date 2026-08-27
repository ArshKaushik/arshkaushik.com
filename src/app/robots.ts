import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/content";

// /robots.txt via Next's METADATA FILE CONVENTION: robots.ts is a reserved
// filename, so exporting a function that returns this config object is enough —
// Next serialises it into a real robots.txt at that URL. No template, and the
// MetadataRoute.Robots type is what keeps the shape honest.
//
// The policy itself: everything is public, and crawlers get pointed at the
// sitemap so they don't have to discover the case-study URLs by following links.
//
// AI crawlers are deliberately allowed. For a portfolio, being read and cited by
// an AI assistant is a discovery channel, not a cost — see
// learn/machine-readable-portfolio.md.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/" },
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
