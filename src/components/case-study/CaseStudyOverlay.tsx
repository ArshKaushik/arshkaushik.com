"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseStudy } from "@/lib/case-studies";
import CaseStudyDetail from "./CaseStudyDetail";
import BackNav from "./BackNav";

// The dimmed overlay that presents a case study on top of the home page.
// Two callers, same presentation:
//   • the intercepted route (app/@modal/(.)work/[slug]) on a soft navigation
//     — the real home page is already mounted behind it, closing calls
//     router.back() (the default below, no closeHref passed).
//   • the standalone page (app/work/[slug]/page.tsx) on a hard load/refresh
//     — it renders HomeContent itself (not "already mounted", just rendered
//     alongside), and passes closeHref="/" since there's no in-app history
//     to reverse; closing navigates there directly instead.
// This makes a refresh mid-case-study look identical to arriving via soft
// nav, rather than dropping to a bare, home-less standalone page.
//
// Motion (Figma): the backdrop fades in and the card SLIDES UP from the bottom
// of the screen, using the shared --ease-spring-gentle spring. Closing plays it
// in reverse, then navigates (which unmounts this overlay).
//
// Below 900px (Figma node 490:58427) this stops being an inset, dimmed modal —
// it becomes a true full-bleed page (opaque bg-page) with its own "Back" pill
// replacing Sidebar's. The backdrop being opaque + fixed inset-0 at z-50 is
// what makes it cover Sidebar's own bottom pill underneath — no coordination
// between the two components needed. BackNav is passed this same `open` state
// so it slides up/down in sync with the card below, instead of just instantly
// appearing on top of Sidebar's pill the moment this overlay mounts.
//
// pt-10 (below 600px only): Figma 540:90180 now shows a 40px gap between the
// viewport top and the actual content (caseStudyContentArea sits at y=40
// inside a y=0 full-bleed Overlay) — was 80px/pt-20 before a later design
// pass tightened it. min-[600px]:pt-0 restores the exact part-2 value (no top
// padding at 600-900px), and min-[900px]:py-20 (already present) overrides
// both again for the inset desktop modal, unchanged.
export default function CaseStudyOverlay({
    study,
    thumbnailSvg,
    closeHref,
}: {
    study: CaseStudy;
    // Pre-rendered by the caller (a Server Component) and passed straight
    // through to CaseStudyDetail — this component is "use client", so it
    // can't read the thumbnail SVG file itself. See learn/svg-thumbnail-blur.md.
    thumbnailSvg?: string | false;
    // See the file-level comment: omitted for the intercepted-route overlay
    // (closing calls router.back()), passed as "/" by the standalone page
    // (closing navigates there directly instead).
    closeHref?: string;
}) {
    const router = useRouter();
    // `open` drives the enter/exit transition. It starts false (card off-screen,
    // backdrop transparent) and flips true on the next frame so the transition runs.
    const [open, setOpen] = useState(false);
    const closingRef = useRef(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    // Move focus INTO the dialog on open (standard modal behavior). This also
    // pulls focus OFF the card the user clicked. That matters for closing: the
    // card <a> stays in the DOM behind us, so if it kept focus, pressing Esc (a
    // keyboard action) would flip the browser into "keyboard mode" and paint a
    // :focus-visible ring on the card the instant we unmount. With focus parked
    // on this dialog instead, closing just drops focus to <body> — no stray ring.
    // (The dialog is tabIndex=-1 + outline-none so focusing it shows nothing.)
    useEffect(() => {
        dialogRef.current?.focus({ preventScroll: true });
    }, []);

    // Enter animation.
    useEffect(() => {
        const id = requestAnimationFrame(() => setOpen(true));
        return () => cancelAnimationFrame(id);
    }, []);

    // Lock background scroll while the overlay is mounted.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // Close: play the exit transition, then navigate (which unmounts us). The
    // ref guards against double-close (Esc + backdrop). We navigate on a timer
    // rather than transitionend so it still works under "reduce motion" (no
    // transition). router.back() when there's real history to reverse (the
    // intercepted overlay); router.push(closeHref) for the standalone page,
    // which has none.
    const close = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        setOpen(false);
        const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        window.setTimeout(
            () => (closeHref ? router.push(closeHref) : router.back()),
            reduce ? 0 : 520,
        );
    }, [router, closeHref]);

    // Esc closes.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [close]);

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={study.title}
            tabIndex={-1}
            onClick={close}
            className={`fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-page px-0 pt-10 pb-[140px] outline-none transition-opacity duration-[400ms] ease-spring-gentle motion-reduce:transition-none min-[600px]:pt-0 min-[900px]:bg-overlay/12 min-[900px]:px-2.5 min-[900px]:py-20 ${
                open ? "opacity-100" : "opacity-0"
            }`}
        >
            {/* w-full + flex justify-center: the dialog above is flex-col +
                items-center, so THIS div's width is a cross-axis size —
                items-center doesn't stretch it, so without an explicit width it
                shrink-to-fits CaseStudyDetail's 800px preferred size instead of
                the dialog's real available width (that's what an overflow-auto
                ancestor does by design — let content overflow/scroll rather
                than force-shrink it). Never an issue until this <900px
                full-bleed treatment, since 800px always fit before 900px.
                w-full forces this div to take the dialog's actual width, so
                CaseStudyDetail's own max-w-full has a real container to shrink
                against — but that also means dialog's items-center no longer
                centers anything (this div already fills 100%), so this div
                needs its OWN centering for its child, same as the standalone
                page's wrapper (work/[slug]/page.tsx).

                NO onClick here (a past version had stopPropagation on this
                div, a real bug): this div is w-full, spanning the ENTIRE
                width of the dialog, while the card itself is narrower and
                centered — stopping propagation here swallowed clicks in the
                empty space left/right of the card, so the backdrop only
                closed on click above/below the card, never beside it.
                stopPropagation now lives on the inner wrapper below, which
                shrink-wraps to the card's own real width. */}
            <div
                className={`flex w-full justify-center transition-transform duration-[520ms] ease-spring-gentle motion-reduce:transition-none ${
                    open ? "translate-y-0" : "translate-y-[100vh]"
                }`}
            >
                <div onClick={(e) => e.stopPropagation()} className="min-w-0">
                    <CaseStudyDetail study={study} thumbnailSvg={thumbnailSvg} />
                </div>
            </div>
            {closeHref ? (
                <BackNav href={closeHref} open={open} />
            ) : (
                <BackNav onClick={close} open={open} />
            )}
        </div>
    );
}
