import { caseStudies } from "@/lib/case-studies";
import CaseStudyCard from "@/components/ui/CaseStudyCard";

export default function CaseStudies() {
    return (
        <section className="flex w-full flex-col items-start">
            <div className="flex w-full items-start p-6">
                <h2 className="text-[16px] font-normal text-textSecondaryPage">
                    Selected work
                </h2>
            </div>

            {caseStudies.map((study, index) => (
                <CaseStudyCard
                    key={study.title}
                    slug={study.slug}
                    title={study.title}
                    description={study.subtitle}
                    thumbnail={study.thumbnail}
                    isFirst={index === 0}
                />
            ))}
        </section>
    );
}
