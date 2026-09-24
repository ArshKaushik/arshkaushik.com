"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseStudy } from "@/lib/case-studies";
import CaseStudyDetail from "./CaseStudyDetail";
import BackNav from "./BackNav";
import ParticleScrollReveal from "@/components/effects/particleScroll/particleScroll";

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
    closeHref,
}: {
    study: CaseStudy;
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
    // pulls focus OFF the card the user clicked, which is what matters when
    // CLOSING.
    //
    // The mechanism: the card's <a> stays in the DOM behind us. Browsers track
    // a FOCUS MODALITY — in effect "was the last interaction a key or a
    // pointer?" — and :focus-visible is the pseudo-class that matches only
    // when that modality says a focus ring is warranted. Esc is a keyboard
    // action, so pressing it flips the modality to keyboard; if the card still
    // held focus at that moment, it would paint a :focus-visible ring the
    // instant we unmount. Parking focus on this dialog instead means closing
    // drops focus to <body>, and no stray ring appears.
    //
    // tabIndex={-1} is what makes this div focusable at all: it permits a
    // programmatic .focus() while keeping the element out of the Tab order.
    // outline-none means landing on it shows nothing. preventScroll stops the
    // browser from auto-scrolling a newly focused element into view, which
    // would otherwise jump the card the moment it opens.
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

    // Enter animation: mount in the closed state, then flip `open` to true so
    // the CSS transition has two states to travel between.
    //
    // requestAnimationFrame (rAF) queues a callback to run just before the
    // browser's next paint. It's nested here — double-rAF, not single —
    // because a single one can still land in the same frame as React's initial
    // COMMIT, the point where the DOM has been updated but nothing has been
    // painted yet. Flipping `open` in that frame means the closed state is
    // never rendered, so the transition has no FROM value to start from and
    // the card just appears. The inner rAF pushes the flip out one more frame,
    // guaranteeing the closed state gets painted first.
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

    // Lock background scroll while the overlay is mounted.
    //
    // overflow:hidden on <body> is what stops the page behind from scrolling.
    // The complication is the scrollbar. On platforms with CLASSIC scrollbars
    // — ones that occupy real layout space, Windows mostly — hiding it hands
    // that space back to the page, so the viewport gets wider and the whole
    // layout shifts sideways on open and snaps back on close.
    //
    // window.innerWidth - documentElement.clientWidth measures exactly that
    // width: innerWidth counts the scrollbar, clientWidth doesn't, so the
    // difference is whatever the scrollbar was occupying. Padding <body> by it
    // keeps in-flow content (the column, the >=900px sticky sidebar) exactly
    // where it was. On OVERLAY-scrollbar platforms (macOS by default) the
    // scrollbar floats above content and takes no layout space, so this
    // measures 0 and nothing is padded.
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
            // modes, both traceable to one DOM rule: a `click` event is
            // dispatched on the nearest common ANCESTOR of where mousedown and
            // mouseup happened. So a drag that begins inside the card and ends
            // outside it reports its click on this dialog, not on the card.
            //   • selecting text in the card and releasing past its edge
            //     therefore fired a click here → the overlay slammed shut
            //     mid-read;
            //   • on classic-scrollbar platforms, dragging THIS element's own
            //     scrollbar could do the same.
            // onPointerDown records where the press BEGAN, and disqualifies
            // two cases: inside the card (cardRef.contains), or on the
            // scrollbar strip — offsetX is the pointer's x within this
            // element, clientWidth excludes the scrollbar, so an offsetX at or
            // past clientWidth means the press landed ON the scrollbar.
            // onClick then only closes when the press qualified as a genuine
            // backdrop press.
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
            {/* w-full + flex justify-center. The dialog above is flex-col +
                items-center, which makes THIS div's width a CROSS-AXIS size —
                the cross axis being the one perpendicular to the direction
                items are stacked in (here: horizontal, since the stack runs
                vertically). items-center centers along that axis but does not
                stretch, so with no explicit width this div would shrink-to-fit
                CaseStudyDetail's 800px preferred width rather than take the
                dialog's real available width. The overflow-auto ancestor makes
                that worse by design: a scroll container lets content overflow
                and scroll rather than force-shrinking it. Never an issue until
                this <900px full-bleed treatment, since 800px always fit below
                900px.
                w-full forces this div to the dialog's actual width, which
                gives CaseStudyDetail's own max-w-full a real container to
                shrink against. The consequence: the dialog's items-center now
                centers nothing (this div already fills 100%), so this div
                needs its OWN justify-center for its child — same arrangement
                as the standalone page's wrapper (work/[slug]/page.tsx).

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
                    <CaseStudyDetail study={study} />
                </div>
            </div>
            {/* The sand reveal's canvas. A direct child of this dialog (the
                scroll container it positions itself in), not of the sliding
                wrapper above: inside that wrapper it would ride along with
                the slide-up transform. Rendered after the card so it paints
                on top of it, and before BackNav so the pill stays above. */}
            <ParticleScrollReveal
                scrollerRef={dialogRef}
                cardRef={cardRef}
                open={open}
            />
            {closeHref ? (
                <BackNav href={closeHref} open={open} />
            ) : (
                <BackNav onClick={close} open={open} />
            )}
        </div>
    );
}
