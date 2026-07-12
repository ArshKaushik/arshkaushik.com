import Hero from "@/components/sections/Hero";
import CaseStudies from "@/components/sections/CaseStudies";
import Footer from "@/components/sections/Footer";

// Figma: "main" — the fixed 600px content column with dashed side rails.
//
// WHY THE RAILS ARE ON AN ::after OVERLAY (not on main's own background):
// The left/right rails must run continuously down the WHOLE column, including
// over the white section boxes (tagline, cards). If we drew them as main's own
// background (`dashed dash-x`), each child's white `bg-surface` would paint OVER
// the rails and hide them — a child's background ALWAYS covers its parent's
// background. So instead we paint the rails on an `::after` pseudo-element:
//   • after:absolute after:inset-0  → one box the full size of the column
//   • it's a positioned child, so it stacks ABOVE the normal-flow sections
//     (and their white fills), keeping the rails visible everywhere
//   • being ONE element, the dash pattern stays continuous top-to-bottom
//   • after:content-[''] is required for a pseudo-element to render at all
//   • after:pointer-events-none so the overlay never blocks clicks on the links
//   • after:dashed after:dash-x reuses the same dashed utilities, just scoped to
//     the pseudo — dash-x = left + right edges.
// (main is `relative` so the absolute overlay is positioned against it.)
//
// mb-[140px] (below 900px only): Sidebar becomes a fixed bottom pill at this
// width (~88px tall + 40px inset). Without clearance, it can cover Footer's
// text at max scroll. margin (not padding) keeps the ::after rails ending
// exactly where they do today instead of stretching into the empty space.
export default function Home() {
  return (
    <main className="relative flex w-[600px] flex-col items-start gap-6 overflow-clip pt-10 mb-[140px] snap-center-x after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:dashed after:dash-x min-[900px]:mb-0">
      <Hero />
      <CaseStudies />
      <Footer />
    </main>
  );
}
