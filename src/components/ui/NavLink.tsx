import Link from "next/link";

// Figma component: "navLink" — one link in the sidebar.
// Reused for every entry in navLinks, so its styling lives in exactly one place.
//
// HOVER INTERACTION (Figma variant "Hover/Active"): on hover the text grows
// 12px → 14px and its colour goes secondary-grey → primary-black.
//
// HOW THE GROWTH IS ANIMATED — scale, NOT font-size, and why that matters:
//   1. Resting state = the plain classes:  text-[12px] text-textSecondaryPage
//   2. Hovered state = hover:scale-[1.1667] hover:text-textPrimary
//      14/12 = 1.1667, so the scaled glyphs render at exactly the 14px the
//      design asks for — visually identical to changing font-size.
//   3. WHY NOT ANIMATE font-size DIRECTLY (the first version did): font-size
//      is a LAYOUT property. Animating it forces the browser to re-run text
//      layout on EVERY FRAME for the full 520ms — and in the bottom-pill
//      tiers (<900px), where links are shrink-to-fit in a justify-between
//      row, one link growing re-distributed the whole row each frame, so
//      neighbouring links visibly shuffled during the hover. `scale` (like
//      translate/opacity) animates on the compositor: the layout box stays
//      12px-sized and untouched, siblings never move, no reflow at all.
//   4. `origin-left` (transform-origin: left center) makes the text grow
//      rightward from its anchored left edge — same directional behaviour
//      the fixed w-[180px] box gave the old version at >=900px, now true in
//      the pill rows too.
//   5. TAILWIND v4 TRAP: scale-* utilities compile to the STANDALONE `scale`
//      CSS property, not `transform`. So the transition list must name
//      `scale` — transition-[color,scale] — a transition on `transform`
//      would simply never fire for it.
//   6. duration-[520ms] ease-spring-gentle — the site's single motion token
//      pair (the spring curve is defined once in globals.css; 520ms is the
//      one duration used everywhere, rounded from the spring's ~511ms
//      derived settle time).
//   7. motion-reduce:transition-none — accessibility: if the OS "Reduce
//      motion" setting is on, the text still changes size/colour, just
//      without animating.
//
// Note: because the layout box stays at the 12px size, the hover target and
// the row spacing are byte-identical to the resting design at every tier —
// only the painted glyphs grow.
//
// Exported so the case-study "Back" pill (BackNav.tsx) can reuse the exact
// same text styling without duplicating it — same "styling lives in exactly
// one place" reasoning as this component itself.
export const navLinkClassName =
  "flex h-7 origin-left items-center text-[12px] text-textSecondaryPage transition-[color,scale] duration-[520ms] ease-spring-gentle hover:scale-[1.1667] hover:text-textPrimary motion-reduce:transition-none min-[900px]:w-[180px]";

export default function NavLink({
  href,
  target,
  children,
}: {
  href: string;
  target?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className={navLinkClassName}
    >
      {children}
    </Link>
  );
}
