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

// /llms.txt — a ROUTE HANDLER: a file that exports functions named after HTTP
// verbs (just GET here) and returns a Response directly, rather than returning
// JSX for Next to render. Written this way because Next has no reserved file
// convention for llms.txt the way it does for sitemap.ts and robots.ts, so the
// URL has to be served by hand.
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
// there is no second copy of anything to drift out of sync, so a reworded stat
// or a newly added case study reaches this file with no extra step.

// force-static: build this response once at build time instead of running GET()
// on every request. A Route Handler is dynamic by default, meaning each hit
// would wake a serverless function; prerendered, each hit is instead served
// from Vercel's ISR cache (Incremental Static Regeneration — the layer that
// stores prerendered output and serves it without invoking any compute). One
// small cache read, no function invocation, no per-visit cost.
export const dynamic = "force-static";

// Inline markdown is left INTACT here, unlike in structured-data.ts where
// everything goes through plain(). The difference is the consumer: this
// response is markdown, so companyContext's `[Precisely](url)` renders as a
// real link for whoever reads it. JSON-LD has no notion of markdown, so the
// same string there would ship literal brackets and asterisks.
function studyBlock(study: CaseStudy): string {
    const lines = [`### ${study.title}`, study.subtitle, ""];

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
