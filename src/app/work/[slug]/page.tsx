import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { caseStudies } from "@/lib/case-studies";
import { identity } from "@/lib/content";
import CaseStudyDetail from "@/components/case-study/CaseStudyDetail";
import BackNav from "@/components/case-study/BackNav";

// The STANDALONE case-study page: what you get on a direct load / refresh /
// shared link to /work/[slug] (interception only happens on soft, in-app
// navigation). It reuses the same CaseStudyDetail card, centered in the
// content column beside the sidebar from the root layout.
//
// Below 900px (Figma node 490:58427) it matches the intercepted overlay's
// full-bleed + "Back" pill treatment instead, for visual consistency
// regardless of how the user arrived at this URL. "Back" navigates home
// (not router.back()) — a hard load has no client-side history to reverse.
//
// pt-20 below 600px, min-[600px]:pt-0 restoring 0 for 600-900px: matches
// CaseStudyOverlay.tsx's identical fix — Figma 540:90180 shows an 80px gap
// above the content in the full-bleed tier that was missed initially.

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
    return (
        <>
            {/* >=900px: unchanged inline layout beside the sidebar */}
            <div className="hidden w-full min-w-0 justify-center px-2.5 py-20 min-[900px]:flex">
                <CaseStudyDetail study={study} />
            </div>
            {/* <900px: full-bleed page + bottom "Back" pill */}
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-page pt-20 pb-[140px] min-[600px]:pt-0 min-[900px]:hidden">
                <CaseStudyDetail study={study} />
            </div>
            <BackNav href="/" />
        </>
    );
}
