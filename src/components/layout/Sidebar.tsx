"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { identity, navLinks, pageNavLinks } from "@/lib/content";
import { currentPageHref } from "@/lib/nav";
import NavLink from "@/components/ui/NavLink";
import BottomNavPill from "./BottomNavPill";

export default function Sidebar() {
    const pathname = usePathname();
    // On a case-study page below 900px, CaseStudyOverlay's own BackNav pill
    // takes the bottom pill's exact spot (fixed bottom-5 left-1/2). The pill
    // isn't rendered there at all rather than left underneath by stacking
    // order (z-40 vs BackNav's z-50), which is fragile on real touch hardware.
    const isCaseStudyRoute = pathname.startsWith("/work/");
    const current = currentPageHref(pathname);

    return (
        <>
            {/* Below 900px: identity + current page + native dropdown. */}
            <BottomNavPill hideBottomPill={isCaseStudyRoute} />

            {/* 900px and up: the sticky sidebar column. */}
            <aside className="sticky top-0 z-40 hidden h-screen w-[260px] shrink-0 flex-col items-start justify-between gap-6 bg-page px-10 pt-11 pb-10 min-[900px]:flex">
                <Link
                    href="/"
                    className="flex flex-col items-start gap-2 whitespace-nowrap"
                >
                    <p className="text-[14px] text-textPrimary">
                        {identity.name}
                    </p>
                    <p className="text-[12px] text-textSecondaryPage">
                        {identity.role}
                    </p>
                </Link>

                <nav className="flex w-full flex-col items-start gap-2">
                    {pageNavLinks.map((link) => (
                        <NavLink
                            key={link.label}
                            href={link.href}
                            active={link.href === current}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <nav className="flex w-full flex-col items-start gap-2">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.label}
                            href={link.href}
                            target="_blank"
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
}
