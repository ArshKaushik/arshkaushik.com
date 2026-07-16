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
    // Pre-rendered inline <svg> markup for the study's thumbnail, computed by
    // the server-component caller — this file is "use client", so it can only
    // forward the string; it must never import inline-svg.ts itself (Node's
    // `fs` can't be bundled for the browser — learn/svg-thumbnail-blur.md §5).
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
    const cardRef = useRef<HTMLDivElement>(null);
    // True while the CURRENT press started on the backdrop (not inside the
    // card, not on the scrollbar) — see the pointer handlers on the dialog.
    const backdropPressRef = useRef(false);

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

    // Make everything OUTSIDE the dialog inert while it's open. aria-modal
    // only *tells* assistive tech the background is off-limits — it doesn't
    // stop Tab from walking into the dimmed home page behind us. `inert`
    // actually enforces it (unfocusable + hidden from the accessibility
    // tree). The dialog's position in the DOM differs per caller (direct
    // body child via the @modal slot on soft nav; nested inside the layout
    // column on a hard load), so instead of assuming a structure, walk UP
    // from the dialog and inert every sibling at each level — that covers
    // exactly "everything except my ancestors" in both shapes. Only elements
    // we actually flipped get restored, so anything already inert for other
    // reasons is left alone.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const flipped: HTMLElement[] = [];
        let node: HTMLElement = dialog;
        while (node.parentElement && node !== document.body) {
            const parent = node.parentElement;
            for (const sibling of Array.from(parent.children)) {
                if (
                    sibling !== node &&
                    sibling instanceof HTMLElement &&
                    !sibling.inert
                ) {
                    sibling.inert = true;
                    flipped.push(sibling);
                }
            }
            node = parent;
        }
        return () => flipped.forEach((el) => (el.inert = false));
    }, []);

    // Enter animation. Double-rAF, not single: the first rAF can fire in the
    // same frame as the initial commit (before the browser has painted the
    // closed state), in which case the transition would have nothing to
    // animate FROM and the card would just appear. The nested rAF guarantees
    // at least one painted frame of the closed state first.
    useEffect(() => {
        let raf2: number | undefined;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setOpen(true));
        });
        return () => {
            cancelAnimationFrame(raf1);
            if (raf2 !== undefined) cancelAnimationFrame(raf2);
        };
    }, []);

    // Lock background scroll while the overlay is mounted. Hiding the page
    // scrollbar widens the viewport by the scrollbar's width on platforms
    // with classic (non-overlay) scrollbars — Windows, mostly — which shifts
    // the whole layout sideways on open and back on close. Padding the body
    // by that exact width keeps in-flow content (the column, the >=900px
    // sticky sidebar) where it was. Overlay-scrollbar platforms (macOS
    // default) measure 0 and are untouched.
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        const prevPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth =
            window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        return () => {
            document.body.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPaddingRight;
        };
    }, []);

    // Close: play the exit transition, then navigate (which unmounts us). The
    // ref guards against double-close (Esc + backdrop). We navigate on a timer
    // rather than transitionend so it still works under "reduce motion" (no
    // transition). router.back() when there's real history to reverse (the
    // intercepted overlay); router.replace(closeHref) for the standalone page
    // — replace, not push, so the browser Back button doesn't return to the
    // case study the user JUST closed (their original /work/[slug] entry is
    // still in history from however they arrived).
    const close = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        setOpen(false);
        const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        window.setTimeout(
            () => (closeHref ? router.replace(closeHref) : router.back()),
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
            // Backdrop-close, but only when the PRESS also started on the
            // backdrop. A bare onClick={close} here had two real failure
            // modes, both because `click` fires on the nearest common
            // ancestor of mousedown/mouseup:
            //   • selecting text in the card and releasing past its edge
            //     fired a click on this dialog → the overlay slammed shut
            //     mid-read;
            //   • on classic-scrollbar platforms, interacting with THIS
            //     element's own scrollbar could do the same.
            // onPointerDown records where the press began — inside the card
            // (via cardRef) or on the scrollbar strip (offsetX past
            // clientWidth) means "not a backdrop press" — and onClick only
            // closes when the press qualified.
            onPointerDown={(e) => {
                const onScrollbar =
                    e.target === e.currentTarget &&
                    e.nativeEvent.offsetX >= e.currentTarget.clientWidth;
                backdropPressRef.current =
                    !onScrollbar &&
                    !cardRef.current?.contains(e.target as Node);
            }}
            onClick={() => {
                if (backdropPressRef.current) close();
            }}
            className={`fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-page px-0 pt-10 pb-[140px] outline-none transition-opacity duration-[520ms] ease-spring-gentle motion-reduce:transition-none min-[600px]:pt-0 min-[900px]:bg-overlay/12 min-[900px]:px-2.5 min-[900px]:py-20 ${
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
                <div
                    ref={cardRef}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0"
                >
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
