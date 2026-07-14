import { caseStudies } from "@/lib/case-studies";
import { getInlineSvg } from "@/lib/inline-svg";
import CaseStudyCard from "@/components/ui/CaseStudyCard";

// getInlineSvg touches Node's `fs`, so it's called HERE (a Server Component)
// rather than inside CaseStudyCard itself — CaseStudyCard is also reachable
// from client-rendered trees elsewhere, and `fs` can't be bundled for the
// browser. See inline-svg.ts / learn/svg-thumbnail-blur.md.
export default function CaseStudies() {
    return (
        <section className="flex w-full flex-col items-start">
            <div className="flex w-full items-start p-6">
                <p className="text-[16px] text-textSecondaryPage">Selected work</p>
            </div>

            {caseStudies.map((study, index) => (
                <CaseStudyCard
                    key={study.title}
                    slug={study.slug}
                    title={study.title}
                    description={study.summary}
                    thumbnailSvg={
                        study.thumbnailCover &&
                        getInlineSvg(study.thumbnailCover, "xMinYMid slice")
                    }
                    isFirst={index === 0}
                />
            ))}
        </section>
    );
}
