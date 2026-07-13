import Hero from "@/components/sections/Hero";
import CaseStudies from "@/components/sections/CaseStudies";
import Footer from "@/components/sections/Footer";

// Figma: "main" — the content column with dashed side rails. Fixed 600px at
// >=600px; fluid (100% minus a 16px margin, via snap-center-x) below that.
// (600, not the design's nominal 480px handoff — see snap-center-x's comment
// in globals.css for why 600 is the actual, arithmetic-forced floor.)
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
//   • after:dash-x-edge-safe = left + right edges, inset 1px from the true
//     edge as a safety margin against a rare zoom-level rendering bug (see
//     that utility's comment in globals.css) — not the plain `dashed dash-x`
//     combo used elsewhere on the site.
// (main is `relative` so the absolute overlay is positioned against it.)
//
// pt-20 (below 600px only): more breathing room at this width, per Figma
// frame 530:77557 (hero sits at y=80 there, vs. today's pt-10=40px at wider
// tiers). min-[600px]:pt-10 restores today's exact value.
//
// pb-[176px] (below 600px only): below 900px, Sidebar is a fixed bottom
// pill; below 600px specifically it's MobileNavPill, which can EXPAND to
// 136px tall (88 collapsed + 48 for the revealed links) while the user has
// it open at the bottom of the page — clearance must cover that worst case
// (136 + 40px inset = 176), not just the collapsed height. min-[600px]:
// pb-[140px] restores the exact part-2 value (that pill is a constant
// 88px tall, no expand/collapse there), and min-[900px]:pb-0 drops it
// entirely once Sidebar is back to being a normal in-flow column.
export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-start gap-6 overflow-clip pt-20 pb-[176px] snap-center-x after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:dash-x-edge-safe min-[600px]:pt-10 min-[600px]:pb-[140px] min-[900px]:pb-0">
      <Hero />
      <CaseStudies />
      <Footer />
    </main>
  );
}
