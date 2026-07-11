import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { caseStudies } from "@/lib/case-studies";
import { identity } from "@/lib/content";
import CaseStudyDetail from "@/components/case-study/CaseStudyDetail";

// The STANDALONE case-study page: what you get on a direct load / refresh /
// shared link to /work/[slug] (interception only happens on soft, in-app
// navigation). It reuses the same CaseStudyDetail card, centered in the
// content column beside the sidebar from the root layout.

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
        <div className="flex w-full min-w-0 justify-center px-2.5 py-20">
            <CaseStudyDetail study={study} />
        </div>
    );
}
