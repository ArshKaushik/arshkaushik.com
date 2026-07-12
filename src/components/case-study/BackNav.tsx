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
type Props =
    | { href: string; onClick?: undefined }
    | { href?: undefined; onClick: () => void };

const pillClassName =
    "fixed bottom-10 left-1/2 z-50 flex w-[120px] -translate-x-1/2 items-center justify-center gap-2.5 dashed dash-x dash-y bg-surface p-6 shadow-[0px_0px_16px_3px_rgba(17,17,17,0.06)] min-[900px]:hidden";

export default function BackNav(props: Props) {
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
