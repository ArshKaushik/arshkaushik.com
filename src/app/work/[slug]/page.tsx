import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { caseStudies } from "@/lib/case-studies";
import { identity } from "@/lib/content";
import { getInlineSvg } from "@/lib/inline-svg";
import HomeContent from "@/components/sections/HomeContent";
import CaseStudyOverlay from "@/components/case-study/CaseStudyOverlay";

// The STANDALONE case-study page: what you get on a direct load / refresh /
// shared link to /work/[slug] (interception only happens on soft, in-app
// navigation). Renders HomeContent (the same home page markup) dimmed behind
// CaseStudyOverlay with closeHref="/", so a hard load/refresh looks identical
// to arriving via the intercepted overlay instead of dropping to a bare,
// home-less page — see CaseStudyOverlay.tsx's file-level comment for the
// closeHref mechanism.

// Pre-render all three /work/<slug> pages at build time (SSG). Returning the
// known slugs lets Next generate static HTML instead of rendering on request.
export function generateStaticParams() {
    return caseStudies.map((study) => ({ slug: study.slug }));
}

// Per-page <title>/<meta description> for shared links & SEO.
export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const study = caseStudies.find((c) => c.slug === slug);
    if (!study) return {};
    return {
        title: `${study.title} — ${identity.name}`,
        description: study.summary,
    };
}

export default async function CaseStudyPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const study = caseStudies.find((c) => c.slug === slug);
    if (!study) notFound();
    // getInlineSvg touches Node's `fs` and must run here (a Server Component) —
    // CaseStudyOverlay is "use client". See learn/svg-thumbnail-blur.md.
    const thumbnailSvg =
        study.thumbnailCover && getInlineSvg(study.thumbnailCover, "xMidYMid slice");
    return (
        <>
            <HomeContent />
            <CaseStudyOverlay study={study} thumbnailSvg={thumbnailSvg} closeHref="/" />
        </>
    );
}
