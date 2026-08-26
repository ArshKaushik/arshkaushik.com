import Hero from "@/components/sections/Hero";
import CaseStudies from "@/components/sections/CaseStudies";
import Footer from "@/components/sections/Footer";

export default function HomeContent() {
    return (
        // id="content": target of the skip link in layout.tsx.
        <main
            id="content"
            className="relative flex min-h-screen flex-col items-start gap-6 overflow-clip [overflow-clip-margin:2px] pt-10 pb-[176px] snap-center-x after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:dashed after:dash-x min-[600px]:pb-[140px] min-[900px]:pb-0"
        >
            <Hero />
            <CaseStudies />
            <Footer />
        </main>
    );
}
