import Hero from "@/components/sections/Hero";
import CaseStudies from "@/components/sections/CaseStudies";
import Footer from "@/components/sections/Footer";

// Figma: "main" — the fixed 600px content column with dashed side rails.
// This page just stacks the sections in order; the gap shows the page background
// between the white section boxes.
export default function Home() {
    return (
        <main className="flex w-[600px] flex-col items-start gap-6 overflow-clip dashed dash-x pt-10 snap-center-x">
            <Hero />
            <CaseStudies />
            <Footer />
        </main>
    );
}
