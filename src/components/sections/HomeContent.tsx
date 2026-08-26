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
// across the white section boxes (tagline, cards).
//
// Drawing them as main's own background (`dashed dash-x`) can't work, because
// of PAINTING ORDER: the browser paints a parent's background first, then
// paints its children on top. So each section's white `bg-surface` would land
// over the rails and hide them. A child's background always wins against its
// parent's.
//
// The fix is to paint the rails on an ::after PSEUDO-ELEMENT — an extra box
// CSS generates inside the element, styleable like a real one but absent from
// the HTML:
//   • after:absolute after:inset-0  → one box pinned to all four edges, so it
//     matches the column's full size
//   • being POSITIONED (anything with a `position` other than static) puts it
//     in a later paint layer than the in-flow sections, so it lands ABOVE
//     their white fills and the rails stay visible everywhere
//   • being ONE element, the dash pattern stays continuous top-to-bottom
//     instead of restarting at each section
//   • after:content-[''] is mandatory — a pseudo-element with no `content`
//     is never generated at all, even with every other style set
//   • after:pointer-events-none makes the overlay transparent to the mouse,
//     so this full-size box can't swallow clicks meant for the links beneath
//   • after:dashed after:dash-x = left + right edges, the same combo used
//     elsewhere on the site (Hero, cards, Sidebar)
// (main is `relative` so the absolutely-positioned overlay measures itself
// against main rather than against the page.)
//
// [overflow-clip-margin:2px] alongside overflow-clip.
//
// overflow-clip hides anything painted outside the element's box — like
// overflow-hidden, except it does NOT turn the element into a scroll
// container, so nothing here can ever be scrolled or programmatically
// scrolled out of view.
//
// The bug it caused: at non-100% browser zoom (e.g. 33%), the right rail's
// position is derived from main's own rendered width, and that arithmetic can
// round to a fraction of a pixel OUTSIDE main's box. A bare overflow-clip
// treats "a hair outside" as outside and clips the whole rail away, so the
// right rail vanished at some zoom levels.
//
// overflow-clip-margin is the escape valve: it pushes the clip boundary
// outward by the given amount (2px here), so sub-pixel rounding stays inside
// the clip region. An earlier fix instead inset the rail 1px inward, which
// worked but permanently left a visible 1px strip of white `bg-surface`
// beyond the rail at every zoom level. clip-margin tolerates the rounding
// without ever moving the rail off its true, flush edge.
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
//
// Reused by both the home page (src/app/page.tsx) and the standalone
// case-study page (src/app/work/[slug]/page.tsx), which renders this dimmed
// behind CaseStudyOverlay so a hard refresh looks the same as arriving via
// soft navigation — see CaseStudyOverlay.tsx's own comment.
export default function HomeContent() {
  return (
    // id="content": target of the skip link in layout.tsx.
    <main id="content" className="relative flex min-h-screen flex-col items-start gap-6 overflow-clip [overflow-clip-margin:2px] pt-10 pb-[176px] snap-center-x after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:dashed after:dash-x min-[600px]:pb-[140px] min-[900px]:pb-0">
      <Hero />
      <CaseStudies />
      <Footer />
    </main>
  );
}
