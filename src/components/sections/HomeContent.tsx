import Hero from "@/components/sections/Hero";
import CaseStudies from "@/components/sections/CaseStudies";
import Footer from "@/components/sections/Footer";
import PageColumn from "@/components/layout/PageColumn";

export default function HomeContent() {
    return (
        <PageColumn>
            <Hero />
            <CaseStudies />
            <Footer />
        </PageColumn>
    );
}
