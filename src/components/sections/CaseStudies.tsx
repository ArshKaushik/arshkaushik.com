import { caseStudies } from "@/lib/case-studies";
import CaseStudyCard from "@/components/ui/CaseStudyCard";

// Thumbnails are now a plain path passed straight through to an <img> — no
// server-side file read, so nothing here has to be a Server Component on the
// thumbnail's account. This replaced an inline-<svg> pipeline that read the
// files with Node's `fs`: see the `thumbnail` field's comment in
// lib/case-studies/types.ts for why (2,833KB of home HTML, billed as 354
// Vercel ISR read units per request instead of ~2).
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
                    thumbnail={study.thumbnail}
                    isFirst={index === 0}
                />
            ))}
        </section>
    );
}
