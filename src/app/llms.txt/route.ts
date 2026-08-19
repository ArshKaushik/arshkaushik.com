import { caseStudies, type CaseStudy } from "@/lib/case-studies";
import { companyContext } from "@/lib/case-studies/shared";
import {
    education,
    heroTagline,
    identity,
    location,
    navLinks,
    professionalSince,
    siteUrl,
    stats,
    yearsOfExperience,
} from "@/lib/content";

// /llms.txt — a Route Handler, because Next has no file convention for this the
// way it does for sitemap.ts and robots.ts.
//
// What it is: the same idea as robots.txt, but where robots.txt says "what you
// may crawl", this says "here is what this site is about" — clean markdown, no
// navigation, no styling, no JavaScript. A proposed convention rather than a
// standard: some tools read it, many don't.
//
// Why it's worth having anyway: the home page carries ~142 visible words, and
// ~40 of those are the nav rendered twice. An AI handed this portfolio and asked
// to assess it, that fetches only one URL and doesn't follow links, is judging
// Arsh on about a hundred words. This file turns that single fetch into a
// complete brief. Full reasoning: learn/machine-readable-portfolio.md.
//
// Every line is assembled from the same content modules the pages render from —
// no second copy of anything to drift out of sync. Notably it's where each
// study's `deck` sentence finally gets used; nothing in the UI renders it.

// force-static: prerender at build time so this costs no function invocation per
// request, and one small ISR read rather than compute.
export const dynamic = "force-static";

// This is a markdown file, so inline markdown is left INTACT here — the
// companyContext link renders correctly. Only the JSON-LD needs it flattened.
function studyBlock(study: CaseStudy): string {
    const lines = [`### ${study.title}`, study.deck, ""];

    // Role / Team / Timeline / Stack, verbatim from the study's own meta table.
    for (const row of study.meta) {
        lines.push(`${row.label}: ${row.value}`);
    }

    // The impact LEADS, not the bodies: the leads are the headline metrics
    // ("30% faster design-to-ship"), which is what an evaluator is looking for.
    // The bodies are qualifying detail that belongs on the page itself.
    lines.push("", "Impact:");
    for (const point of study.impact) {
        lines.push(`- ${point.lead}`);
    }

    lines.push("", `${siteUrl}/work/${study.slug}`, "");
    return lines.join("\n");
}

function body(): string {
    const out: string[] = [
        `# ${identity.name} — ${identity.role}`,
        "",
        `> ${heroTagline}`,
        "",
        `- Experience: ${yearsOfExperience}+ years in product design (professionally since ${professionalSince})`,
        `- Based in: ${location.city}, ${location.region}`,
    ];

    for (const stat of stats) {
        out.push(`- ${stat.label}: ${stat.value}`);
    }

    out.push("", "## Selected work", "");
    for (const study of caseStudies) {
        out.push(studyBlock(study));
    }

    out.push("## Education");
    for (const e of education) {
        const place = [e.location.city, e.location.country]
            .filter(Boolean)
            .join(", ");
        out.push(`- ${e.degree}, ${e.field} — ${e.institution}, ${place}`);
    }

    // Load-bearing, not decoration. Person.worksFor is deliberately deferred to a
    // future About page, so this paragraph is the ONLY place a machine learns who
    // the work was for and what domain it sits in — "an enterprise data-integrity
    // company… used by thousands of large enterprises". For any query about
    // *enterprise* experience, this is doing more work than any other line here.
    out.push("", "## Context", "", companyContext);

    out.push("", "## Links");
    for (const link of navLinks) {
        out.push(`- ${link.label}: ${link.href.replace(/^mailto:/, "")}`);
    }

    return out.join("\n") + "\n";
}

export function GET() {
    return new Response(body(), {
        headers: { "content-type": "text/plain; charset=utf-8" },
    });
}
