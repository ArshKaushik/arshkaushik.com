import { identity, navLinks } from "@/lib/content";
import NavLink from "@/components/ui/NavLink";
import MobileNavPill from "./MobileNavPill";

export default function Sidebar() {
    return (
        <>
            {/* Below 600px: collapsible identity+chevron pill, its own component
                (see MobileNavPill.tsx) since it needs client-side state that
                the rest of this responsive system doesn't. (600, not the
                Figma design's nominal 480px handoff — see MobileNavPill.tsx
                and snap-center-x's comment in globals.css for why 600 is the
                real, arithmetic-forced floor.) */}
            <MobileNavPill identity={identity} navLinks={navLinks} />

            {/* slide-in-tablet-pill (globals.css): plays a slide-up-from-below
                entrance the instant this pill's own 600-900px range starts
                matching — i.e. whenever the sticky desktop sidebar above 900px
                (or MobileNavPill below 600px) hands off to this one. */}
            <aside className="hidden fixed bottom-10 left-1/2 z-40 w-[520px] shrink-0 -translate-x-1/2 items-center justify-between gap-6 dashed dash-x dash-y bg-surface p-6 shadow-[0px_0px_16px_3px_rgba(17,17,17,0.06)] min-[600px]:flex slide-in-tablet-pill min-[900px]:sticky min-[900px]:top-0 min-[900px]:bottom-auto min-[900px]:left-auto min-[900px]:h-screen min-[900px]:w-[260px] min-[900px]:translate-x-0 min-[900px]:flex-col min-[900px]:items-start min-[900px]:bg-page min-[900px]:px-10 min-[900px]:pt-11 min-[900px]:pb-10 min-[900px]:shadow-none min-[900px]:[background-image:none]">

                <div className="flex flex-col items-start gap-2 whitespace-nowrap">
                    <p className="text-[14px] text-textPrimary">
                        {identity.name}
                    </p>
                    <p className="text-[12px] text-textSecondaryPage">
                        {identity.role}
                    </p>
                </div>


                <nav className="flex items-start gap-4 min-[900px]:w-full min-[900px]:flex-col min-[900px]:gap-2">
                    {navLinks.map((link) => (
                        <NavLink key={link.label} href={link.href}>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
}
