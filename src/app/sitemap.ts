import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/case-studies";
import { siteUrl } from "@/lib/content";

// /sitemap.xml via Next's metadata file convention (same mechanism as
// robots.ts: reserved filename, return the data, Next writes the XML) — the
// home page plus the three case-study routes, sourced from the same caseStudies
// module the pages render from, so a new study is included automatically.
//
// changeFrequency and priority are HINTS ONLY. Google has said publicly it
// largely ignores both; they cost nothing and are conventional, but nothing
// here depends on a crawler honouring them.
//
// lastModified: new Date() resolves at BUILD time, not per request — this route
// is prerendered (see the ○ marker beside /sitemap.xml in `next build`). So the
// date reported is the moment of the last deploy, not the moment the file was
// actually last edited. Fine as an approximation, but worth knowing it's a
// deploy timestamp rather than real per-page modification tracking.

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
