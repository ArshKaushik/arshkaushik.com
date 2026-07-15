import type { MetadataRoute } from "next";

// /robots.txt via Next's metadata file convention: everything is public, and
// crawlers get pointed at the sitemap.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/" },
        sitemap: "https://arshkaushik.com/sitemap.xml",
    };
}
