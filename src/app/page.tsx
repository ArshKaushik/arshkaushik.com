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
//   • after:dashed after:dash-x = left + right edges, the same combo used
//     elsewhere on the site (Hero, cards, Sidebar).
// (main is `relative` so the absolute overlay is positioned against it.)
//
// [overflow-clip-margin:2px] alongside overflow-clip: at non-100% browser
// zoom (e.g. 33%), the right rail's position (`right`, derived from main's
// own rendered width) can round to land a hair outside main's box — and
// with a bare `overflow-clip`, "a hair outside" gets fully clipped away,
// making that rail disappear. An earlier version fixed this by insetting
// the rail 1px inward instead, but that permanently left a visible 1px gap
// of white `bg-surface` beyond the rail at every zoom level. clip-margin
// gives the clip box slack to tolerate that rounding without ever shifting
// the rail off its true, flush edge.
//
// pt-10: Figma frame 530:77557 has the hero sitting at y=40, matching the
// same pt-10=40px already used at wider tiers — so this is a single flat
// value with no mobile-only override (an earlier design had mobile at
// y=80/pt-20, "more breathing room" than wider tiers, but that's gone now).
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
    <main className="relative flex min-h-screen flex-col items-start gap-6 overflow-clip [overflow-clip-margin:2px] pt-10 pb-[176px] snap-center-x after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:dashed after:dash-x min-[600px]:pb-[140px] min-[900px]:pb-0">
      <Hero />
      <CaseStudies />
      <Footer />
    </main>
  );
}
