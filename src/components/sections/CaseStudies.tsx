import { caseStudies } from "@/lib/content";
import CaseStudyCard from "@/components/ui/CaseStudyCard";

export default function CaseStudies() {
    return (
        <section className="flex w-full flex-col items-start">
            <div className="flex w-full items-start p-6">
                <p className="text-[16px] text-textSecondaryPage">Selected work</p>
            </div>

            {caseStudies.map((study, index) => (
                <CaseStudyCard
                    key={study.title}
                    title={study.title}
                    description={study.description}
                    isFirst={index === 0}
                />
            ))}
        </section>
    );
}
