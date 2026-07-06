"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseStudy } from "@/lib/case-studies";
import CaseStudyDetail from "./CaseStudyDetail";

// The dimmed overlay that presents a case study on top of the home page.
// Rendered by the intercepted route (app/@modal/(.)work/[slug]) on a soft
// navigation, so the home page stays mounted behind it.
//
// Motion (Figma): the backdrop fades in and the card SLIDES UP from the bottom
// of the screen, using the shared --ease-spring-gentle spring. Closing plays it
// in reverse, then navigates back (which unmounts this overlay).
export default function CaseStudyOverlay({ study }: { study: CaseStudy }) {
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

    // Close: play the exit transition, then go back (which unmounts us). The ref
    // guards against double-close (Esc + backdrop). We navigate on a timer rather
    // than transitionend so it still works under "reduce motion" (no transition).
    const close = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        setOpen(false);
        const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        window.setTimeout(() => router.back(), reduce ? 0 : 520);
    }, [router]);

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
            className={`fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-overlay/12 px-2.5 py-20 outline-none transition-opacity duration-[400ms] ease-spring-gentle motion-reduce:transition-none ${
                open ? "opacity-100" : "opacity-0"
            }`}
        >
            {/* Clicks INSIDE the card must not bubble to the backdrop (which closes). */}
            <div
                onClick={(e) => e.stopPropagation()}
                className={`transition-transform duration-[520ms] ease-spring-gentle motion-reduce:transition-none ${
                    open ? "translate-y-0" : "translate-y-[100vh]"
                }`}
            >
                <CaseStudyDetail study={study} />
            </div>
        </div>
    );
}
