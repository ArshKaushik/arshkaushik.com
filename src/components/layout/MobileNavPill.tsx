"use client";

import { useId, useState } from "react";
import NavLink from "@/components/ui/NavLink";

// Below 600px (Figma frames 530:77557 collapsed / 530:79829 expanded, whose
// design intent switches at 480px — but 600px is the real, arithmetic-forced
// floor: `main` is a literal 600px column at this tier, via snap-center-x in
// globals.css, and a 600px box cannot fit a narrower container, full stop;
// see that utility's comment for the exact overflow measurement) the
// sidebar's identity+links pill can no longer fit both side-by-side — instead
// it collapses to identity+chevron, and tapping the chevron reveals the links
// below it. This is the first piece of client-side interactive state in the
// whole responsive system; everything else so far is pure CSS breakpoints.
// Kept as its own component (rather than folded into Sidebar.tsx) so this
// new interactive/animation code stays isolated from the already-shipped,
// working >=600px CSS.
export default function MobileNavPill({
    identity,
    navLinks,
    hideBottomPill = false,
}: {
    identity: { name: string; role: string };
    navLinks: { label: string; href: string }[];
    // True on a case-study route: CaseStudyOverlay's own BackNav pill fully
    // replaces this tier and shares its exact screen position — see
    // Sidebar.tsx's comment for why this isn't just left to stacking order.
    hideBottomPill?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const panelId = useId();

    return (
        <aside
            // slide-in-mobile-pill (globals.css): plays a slide-up-from-below
            // entrance the instant this pill's own <600px range starts
            // matching — i.e. whenever the 600-900px tablet pill above hands
            // off to this one.
            className={`fixed bottom-10 left-1/2 z-40 flex w-[calc(100%-72px)] -translate-x-1/2 flex-col dashed dash-x dash-y bg-surface p-6 shadow-[0px_0px_16px_3px_rgba(17,17,17,0.06)] transition-[gap] duration-[520ms] ease-spring-gentle motion-reduce:transition-none slide-in-mobile-pill min-[600px]:hidden ${
                expanded ? "gap-5" : "gap-0"
            } ${hideBottomPill ? "!hidden" : ""}`}
        >
            <div className="flex w-full items-center justify-between">
                <div className="flex flex-col items-start gap-2 whitespace-nowrap">
                    <p className="text-[14px] text-textPrimary">{identity.name}</p>
                    <p className="text-[12px] text-textSecondaryPage">
                        {identity.role}
                    </p>
                </div>

                {/* Chevron rotates 180deg in place on toggle — Figma's raw export
                    shows the icon's x/y shifting between states, but that's a
                    known artifact of how rotated bounding boxes get reported,
                    not a real instruction to relocate it. */}
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-label={expanded ? "Hide navigation links" : "Show navigation links"}
                    onClick={() => setExpanded((v) => !v)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center text-textSecondarySurface"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        className={`transition-transform duration-[520ms] ease-spring-gentle motion-reduce:transition-none ${
                            expanded ? "rotate-180" : ""
                        }`}
                    >
                        <path
                            d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
            </div>

            {/* grid-template-rows 0fr<->1fr: the standard CSS-only way to animate
                to/from intrinsic "auto" height with no JS measurement.

                The 20px gap between the header row and the links is a
                conditional gap-0/gap-5 on <aside> above (animated alongside
                this track via the same duration/easing), NOT padding on
                <nav> — that was the first thing tried, and it doesn't work:
                padding is unconditional and can never shrink below itself
                regardless of min-height, so a pt-5 on <nav> would permanently
                pin the "collapsed" track at 20px (verified: it did, exactly).
                A plain gap on <aside> would have the same problem if left
                unconditional (a flex/grid gap between siblings renders
                regardless of how small a collapsed sibling is) — making it
                react to `expanded` the same way everything else here does
                sidesteps that.

                collapsed = 24(p-6) + 40(row) + 0(gap) + 0(track) + 24(p-6)
                = 88px; expanded = 24 + 40 + 20(gap) + 28(track, nav's own
                content height) + 24 = 136px — matches Figma. */}
            <div
                id={panelId}
                className={`grid w-full transition-[grid-template-rows] duration-[520ms] ease-spring-gentle motion-reduce:transition-none ${
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
            >
                {/* justify-between (not just gap-4): Figma's expanded row
                    (530:82096) spreads the 4 links across the FULL 282px
                    width — the gaps between them measure a uniform ~39.67px
                    (282 - 163px of link content, divided evenly across 3
                    gaps), not a fixed 16px. gap-4 alone would leave the extra
                    width unclaimed at the end instead of distributing it.
                    Keeping gap-4 alongside justify-between isn't redundant:
                    CSS treats `gap` as a MINIMUM spacing that space-between
                    distributes ADDITIONAL room beyond, so it also acts as a
                    floor as the container narrows toward the ~331px point
                    where flex-wrap (below) kicks in.
                    min-h-0: defensive — lets this shrink fully to the grid
                    track's 0fr size with no residual floor of its own. */}
                <nav className="flex w-full min-h-0 flex-wrap items-start justify-between gap-4 overflow-hidden">
                    {navLinks.map((link) => (
                        <NavLink key={link.label} href={link.href} target="_blank">
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </aside>
    );
}
