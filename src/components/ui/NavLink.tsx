import Link from "next/link";

// Figma component: "navLink" — one link in the sidebar.
// Reused for every entry in navLinks, so its styling lives in exactly one place.
//
// HOVER INTERACTION (Figma variant "Hover/Active"): on hover the text grows
// 12px → 14px and its colour goes secondary-grey → primary-black.
//
// HOW A HOVER INTERACTION WORKS IN TAILWIND — the pattern to reuse:
//   1. Resting state = the plain classes:  text-[12px] text-textSecondaryPage
//   2. Hovered state = the same utilities with a `hover:` prefix:
//                                           hover:text-[14px] hover:text-textPrimary
//      The browser applies the hover classes only while the pointer is over the
//      link, and drops back to the resting classes when it leaves.
//   3. To ANIMATE the change (instead of snapping instantly), add a transition.
//      Figma uses the SAME "Gentle" spring here as the case-study card hover, so
//      we reuse that exact easing rather than inventing one:
//        • transition-[color,font-size] — names exactly which properties animate.
//          We must list font-size explicitly: Tailwind's plain `transition` and
//          `transition-colors` do NOT include font-size, so a bare transition
//          would animate the colour but snap the size.
//        • duration-[511ms] — the spring's settle time (derived from the Figma
//          spring; same value the card uses).
//        • ease-spring-gentle — the sampled spring curve, defined once in
//          globals.css (see the --ease-spring-gentle comment there for why a
//          spring is written as a linear() easing). Same gentle overshoot-and-
//          settle feel as the card, now shared across both hovers.
//   4. motion-reduce:transition-none — accessibility: if the OS "Reduce motion"
//      setting is on, the text still changes size/colour, just without animating.
//
// Note: at >=900px the container is a fixed box (h-7, w-[180px]) with
// items-center, so the larger 14px text stays vertically centred and simply
// grows rightward — it never pushes the other links around. Below 900px
// (the bottom nav pill) there's no fixed width — links sit in a row and
// shrink-to-fit their own text.
//
// Exported so the case-study "Back" pill (BackNav.tsx) can reuse the exact
// same text styling without duplicating it — same "styling lives in exactly
// one place" reasoning as this component itself.
export const navLinkClassName =
  "flex h-7 items-center text-[12px] text-textSecondaryPage transition-[color,font-size] duration-[511ms] ease-spring-gentle hover:text-[14px] hover:text-textPrimary motion-reduce:transition-none min-[900px]:w-[180px]";

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
