"use client";

import Link from "next/link";
import { navLinkClassName } from "@/components/ui/NavLink";

// Below 900px, opening a case study replaces Sidebar's bottom pill with this
// "Back" pill (Figma node 492:64765) — same dashed/shadow/positioning treatment,
// just centered on one item instead of spread between identity + 4 links.
// `min-[900px]:hidden` because at >=900px the case study goes back to being an
// inset overlay/inline page (Sidebar's own pill stays visible instead).
//
// Two callers, two genuinely different behaviors: the intercepted overlay route
// closes an in-app layer (reuses its existing close()), while the standalone
// page has no client-side history to reverse through a hard load, so it just
// navigates home. Hence exactly one of href / onClick, not both.
type Props = (
    | { href: string; onClick?: undefined }
    | { href?: undefined; onClick: () => void }
) & {
    // Only CaseStudyOverlay passes this — it's the same `open` boolean already
    // driving the card's own slide-up/fade (see CaseStudyOverlay.tsx), reused
    // here so this pill enters/exits in sync with it instead of just
    // instantly covering Sidebar's pill the moment the overlay mounts.
    // Omitted entirely by the standalone page below, which has no "opening"
    // moment to key off — it renders exactly as it always has, no animation.
    open?: boolean;
};

export default function BackNav({ open, ...props }: Props) {
    const pillClassName = `fixed bottom-10 left-1/2 z-50 flex w-[120px] -translate-x-1/2 items-center justify-center gap-2.5 dashed dash-x dash-y bg-surface p-6 shadow-[0px_0px_16px_3px_rgba(17,17,17,0.06)] min-[900px]:hidden ${
        open === undefined
            ? ""
            : `transition-transform duration-[520ms] ease-spring-gentle motion-reduce:transition-none ${
                  open ? "translate-y-0" : "translate-y-[100vh]"
              }`
    }`;

    if (props.href !== undefined) {
        return (
            <Link href={props.href} className={pillClassName}>
                <span className={navLinkClassName}>Back</span>
            </Link>
        );
    }
    return (
        <button type="button" onClick={props.onClick} className={pillClassName}>
            <span className={navLinkClassName}>Back</span>
        </button>
    );
}
