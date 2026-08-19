import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/case-studies";
import { siteUrl } from "@/lib/content";

// /sitemap.xml via Next's metadata file convention — the home page plus the
// three case-study routes, sourced from the same caseStudies module the pages
// render from, so a new study is automatically included.

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: siteUrl,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 1,
        },
        ...caseStudies.map((study) => ({
            url: `${siteUrl}/work/${study.slug}`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        })),
    ];
}
