"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { identity, navLinks, pageNavLinks } from "@/lib/content";
import { currentPageHref } from "@/lib/nav";

// Every sidebar link, in sidebar order: the dropdown's options.
const allLinks = [...pageNavLinks, ...navLinks];

// The bottom nav pill below 900px (Figma 985:80517). Left: identity, a link
// home. Right: the current page + an up/down icon, with a transparent native
// <select> stretched over it. Tapping opens the OS's own picker — on iOS the
// system menu, which it anchors above the pill since the pill sits at the
// bottom of the screen.
export default function BottomNavPill({
    hideBottomPill = false,
}: {
    // True on a case-study route: CaseStudyOverlay's own BackNav pill takes
    // this exact spot (see Sidebar.tsx).
    hideBottomPill?: boolean;
}) {
    const router = useRouter();
    const current = currentPageHref(usePathname());
    const currentLabel =
        pageNavLinks.find((link) => link.href === current)?.label ?? "";
    // True while the select holds focus from a click/tap (see the ring below).
    const [pointerFocus, setPointerFocus] = useState(false);

    // The select is controlled and `current` never changes here, so React
    // snaps it back to the current page after every pick — the label and the
    // picker's checkmark stay right even after opening an external link.
    const navigate = (href: string) => {
        if (href.startsWith("/")) {
            router.push(href);
        } else if (href.startsWith("mailto:")) {
            window.location.href = href;
        } else {
            // New tab like the desktop sidebar; if the pop-up blocker refuses
            // it, open in this tab rather than dropping the tap.
            const opened = window.open(href, "_blank");
            if (opened) opened.opener = null;
            else window.location.href = href;
        }
    };

    return (
        <aside
            // slide-in-bottom-pill (globals.css): slide-up entrance whenever
            // the viewport drops below 900px and this pill takes over from
            // the desktop sidebar.
            // max-[368px]: narrower than 368px, the designed 36px side margins
            // and 20px padding can't fit "Selected work" + the icon, so both
            // tighten to 16px (Figma's 402px frame is unaffected).
            className={`fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-72px)] max-w-[520px] -translate-x-1/2 max-[368px]:w-[calc(100%-32px)] items-center dashed dash-x dash-y bg-surface shadow-[0px_0px_16px_4px_rgba(17,17,17,0.08)] slide-in-bottom-pill min-[900px]:hidden ${
                hideBottomPill ? "!hidden" : ""
            }`}
        >
            <Link
                href="/"
                className="flex shrink-0 flex-col items-start gap-2 whitespace-nowrap p-5 max-[368px]:px-4"
            >
                {/* Line heights pinned to Figma's (17px / 15px) so the pill is
                    its designed 80px: 20 + 17 + 8 + 15 + 20. */}
                <span className="text-[14px] leading-[17px] text-textPrimary">
                    {identity.name}
                </span>
                <span className="text-[12px] leading-[15px] text-textSecondaryPage">
                    {identity.role}
                </span>
            </Link>

            {/* The select is invisible, so its keyboard focus ring is drawn
                on this visible area instead (inset, so it stays inside the
                pill). Browsers match :focus-visible on a <select> even when
                it's clicked or tapped, so a pointer press suppresses the ring
                until focus moves elsewhere on the page; Tab focus still
                shows it. */}
            <div
                className={`relative flex flex-1 items-center justify-end gap-2 self-stretch p-5 max-[368px]:px-4 ${
                    pointerFocus
                        ? ""
                        : "has-[select:focus-visible]:[outline-style:auto] has-[select:focus-visible]:outline-offset-[-2px]"
                }`}
            >
                <span
                    aria-hidden="true"
                    className="whitespace-nowrap text-[14px] leading-[17px] text-textPrimary"
                >
                    {currentLabel}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> like every other image on the site */}
                <img
                    src="/icons/expand-up-down-line.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="block shrink-0"
                />
                {/* text-[16px] although invisible: iOS Safari zooms the page
                    when a form control under 16px is focused. */}
                <select
                    aria-label="Site navigation"
                    value={current}
                    onChange={(e) => navigate(e.target.value)}
                    onPointerDown={() => setPointerFocus(true)}
                    // On a closed select, Up/Down change the value directly in
                    // some browsers (Chrome/Firefox on Windows/Linux), which
                    // would navigate on a single keypress. Open the picker
                    // instead, where arrows only highlight and Enter commits.
                    onKeyDown={(e) => {
                        if (
                            (e.key === "ArrowDown" || e.key === "ArrowUp") &&
                            !e.altKey
                        ) {
                            e.preventDefault();
                            try {
                                e.currentTarget.showPicker();
                            } catch {}
                        }
                    }}
                    // Only a blur WITHIN the page ends the pointer focus. When
                    // an external link opens a new tab, the select blurs
                    // because the whole window lost focus (hasFocus() is
                    // false); coming back restores focus to it, and resetting
                    // here would draw the ring on return.
                    onBlur={() => {
                        if (document.hasFocus()) setPointerFocus(false);
                    }}
                    className="absolute inset-0 cursor-pointer appearance-none text-[16px] opacity-0"
                >
                    {allLinks.map((link) => (
                        <option key={link.href} value={link.href}>
                            {link.label}
                        </option>
                    ))}
                </select>
            </div>
        </aside>
    );
}
