import { caseStudies } from "@/lib/case-studies";
import CaseStudyCard from "@/components/ui/CaseStudyCard";

// Thumbnails are 2x WebP rasters under /public, rendered by next/image inside
// CaseStudyCard — just a path handed down, no server-side file reading. (The
// old inline-SVG pipeline that lived here is gone; the raw Figma SVGs weighed
// 1-3.4MB each and made the home page 11MB of HTML.)
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
                    thumbnailSrc={study.thumbnailCover}
                    isFirst={index === 0}
                />
            ))}
        </section>
    );
}
