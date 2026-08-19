import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/content";

// /robots.txt via Next's metadata file convention: everything is public, and
// crawlers get pointed at the sitemap.
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
