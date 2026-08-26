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
//      is a LAYOUT property — changing it forces the browser to re-measure
//      where every affected box sits. That re-measuring pass is called a
//      REFLOW, and animating font-size means one reflow per frame for the
//      full 520ms. In the bottom-pill tiers (<900px) the links are
//      shrink-to-fit inside a justify-between row, so one link growing
//      re-divided the row's space every frame and the neighbouring links
//      visibly shuffled mid-hover.
//      `scale` sidesteps all of it because it is a COMPOSITED property (as
//      are translate and opacity): the element is laid out once at 12px, and
//      then the COMPOSITOR — the late stage that only transforms and paints
//      already-measured layers, typically on the GPU — stretches the finished
//      pixels. The layout box never changes, so siblings never move and there
//      is no reflow at all.
//   4. `origin-left` sets transform-origin: left center. transform-origin is
//      the anchor point a transform grows from, so pinning it left makes the
//      text expand rightward instead of outward from its centre — the same
//      directional behaviour the fixed w-[180px] box gave the old version at
//      >=900px, now true in the pill rows too.
//   5. TAILWIND v4 TRAP: scale-* utilities compile to the STANDALONE `scale`
//      CSS property, unlike v3 which composed them into `transform`. A
//      transition list naming `transform` would therefore never fire for it,
//      which is why the list here names `scale` directly:
//      transition-[color,scale].
//   6. duration-[520ms] ease-spring-gentle — the site's single motion token
//      pair (the spring curve is defined once in globals.css; 520ms is the
//      one duration used everywhere, rounded from the spring's ~511ms
//      derived settle time).
//   7. motion-reduce:transition-none — accessibility. `motion-reduce` is
//      Tailwind's hook for the prefers-reduced-motion media query, which
//      reports the visitor's OS "Reduce motion" setting. With it on, the text
//      still changes size and colour, it just jumps there instead of
//      animating.
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
