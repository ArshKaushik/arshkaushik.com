import { notFound } from "next/navigation";
import { caseStudies } from "@/lib/case-studies";
import { getInlineSvg } from "@/lib/inline-svg";
import CaseStudyOverlay from "@/components/case-study/CaseStudyOverlay";

// INTERCEPTED route. `(.)work/[slug]` catches a SOFT navigation to /work/[slug]
// (i.e. clicking a <Link> card) and renders the study as an overlay in the
// @modal slot, over the still-mounted home page. A hard load / refresh of
// /work/[slug] is NOT intercepted — it falls through to app/work/[slug]/page.tsx
// (the standalone full page).
export default async function CaseStudyModal({
    params,
}: {
    // In Next 15+, params is async and must be awaited.
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const study = caseStudies.find((c) => c.slug === slug);
    if (!study) notFound();
    // getInlineSvg touches Node's `fs` and must run here (a Server Component) —
    // CaseStudyOverlay is "use client", so it can only receive the already-
    // rendered markup as a prop. See learn/svg-thumbnail-blur.md.
    const thumbnailSvg =
        study.thumbnailCover && getInlineSvg(study.thumbnailCover, "xMidYMid slice");
    return <CaseStudyOverlay study={study} thumbnailSvg={thumbnailSvg} />;
}
