import { caseStudies } from "@/lib/case-studies";
import { getInlineSvg } from "@/lib/inline-svg";
import CaseStudyCard from "@/components/ui/CaseStudyCard";

// getInlineSvg touches Node's `fs`, so it's called HERE (a Server Component)
// rather than inside CaseStudyCard itself — CaseStudyCard is also reachable
// from client-rendered trees elsewhere, and `fs` can't be bundled for the
// browser. See inline-svg.ts / learn/svg-thumbnail-blur.md (§10 records why
// the site is back on inline SVG after two raster generations: visual
// quality, by Arsh's explicit call; the SVGO'd files keep the cost at ~2.9MB
// of home HTML instead of the original 11MB).
export default function CaseStudies() {
    return (
        <section className="flex w-full flex-col items-start">
            <div className="flex w-full items-start p-6">
                {/* h2, not p: gives the home page a real document outline
                    (h1 hero > h2 here > h3 card titles) for screen-reader
                    heading navigation and SEO. Preflight resets heading
                    styles, so the classes render it identically. */}
                <h2 className="text-[16px] font-normal text-textSecondaryPage">
                    Selected work
                </h2>
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
