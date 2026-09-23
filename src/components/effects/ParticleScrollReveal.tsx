"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import {
    createParticleScroll,
    type ParticleScrollInstance,
    type ParticleScrollOptions,
} from "./particle-scroll/engine";
import { snapshotCard } from "./particle-scroll/snapshot";

// Scroll-driven "sand" reveal for the case-study card: below a formation line
// near the bottom of the screen the card is dust; scrolling it up past the
// line makes the dust fly home and settle into the page.
//
// The live card DOM is never replaced or moved. This component only adds one
// decorative <canvas> on top of it (aria-hidden, pointer-events: none, so
// clicks, text selection, wheel scrolling and screen readers all go straight
// through to the real card). Where the card is assembled the canvas is
// transparent; it only paints over rows that are still dust.
//
// The steps:
//   1. Create the WebGL engine (no WebGL2 → render nothing, plain card).
//   2. Take a snapshot of the card (snapshot.ts) once the open animation has
//      played, and hand it to the engine. Until then: plain card.
//   3. If the card changes SIZE (crossing a breakpoint), the engine switches
//      itself off at once and we take a new snapshot after things settle.
// Any failure along the way just unmounts the canvas.

// prefers-reduced-motion, read through useSyncExternalStore so the component
// re-renders if the setting changes while the overlay is open. The server
// snapshot is `true` ("reduced"), so the server never renders the canvas and
// the first client render matches it.
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
    const query = window.matchMedia(REDUCED_MOTION);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

// Wait out the card's 520ms slide-up before snapshotting: cloning the card
// is heavy main-thread work, and there's nothing to reveal until the user
// starts scrolling anyway.
const FIRST_SNAPSHOT_DELAY = 600;
// After a resize, wait for it to stop before re-snapshotting (a window drag
// fires dozens of resizes).
const RESNAPSHOT_DEBOUNCE = 300;

export default function ParticleScrollReveal({
    scrollerRef,
    cardRef,
    open,
    options,
}: {
    // The element that scrolls (the overlay dialog).
    scrollerRef: RefObject<HTMLElement | null>;
    // The element to reveal (the card wrapper).
    cardRef: RefObject<HTMLElement | null>;
    // The overlay's open state — when it flips, the card slides, and the
    // canvas needs to redraw each frame to follow it.
    open: boolean;
    options?: ParticleScrollOptions;
}) {
    const reducedMotion = useSyncExternalStore(
        subscribeReducedMotion,
        () => window.matchMedia(REDUCED_MOTION).matches,
        () => true,
    );
    const [failed, setFailed] = useState(false);
    const active = !reducedMotion && !failed;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<ParticleScrollInstance | null>(null);
    // The first options win at creation; later changes go through setOptions.
    const [initialOptions] = useState(options);

    useEffect(() => {
        if (!active) return;
        const output = canvasRef.current;
        const scroller = scrollerRef.current;
        const card = cardRef.current;
        if (!output || !scroller || !card) return;

        const engine = createParticleScroll(
            { output, scroller, card },
            initialOptions,
            () => setFailed(true),
        );
        if (!engine) {
            setFailed(true);
            return;
        }
        engineRef.current = engine;

        let cancelled = false;
        // Each snapshot request gets a number; a result that comes back after
        // a newer request was made is thrown away (the card has changed).
        let generation = 0;
        let timer: number | undefined;
        // Card size at the last snapshot request, to tell a real resize from
        // the ResizeObserver's initial "here's the current size" callback.
        let requestedSize = "";
        const sizeKey = () => {
            const r = card.getBoundingClientRect();
            return `${r.width.toFixed(1)}x${r.height.toFixed(1)}`;
        };

        const take = async () => {
            const current = ++generation;
            requestedSize = sizeKey();
            try {
                const snapshot = await snapshotCard(card, engine.maxTextureSize);
                if (cancelled || current !== generation) {
                    snapshot.canvas.width = snapshot.canvas.height = 0;
                    return;
                }
                if (process.env.NODE_ENV !== "production") {
                    console.debug(
                        `[particle-scroll] snapshot ${Math.round(snapshot.ms)}ms at ${snapshot.scale.toFixed(2)}x (${snapshot.width.toFixed(0)}x${snapshot.height.toFixed(0)} CSS px)`,
                    );
                }
                engine.setSnapshot(snapshot);
            } catch (error) {
                if (cancelled) return;
                console.warn("[particle-scroll] disabled:", error);
                setFailed(true);
            }
        };

        const schedule = (delay: number) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(take, delay);
        };
        requestedSize = sizeKey();
        schedule(FIRST_SNAPSHOT_DELAY);

        const resizeObserver = new ResizeObserver(() => {
            if (sizeKey() !== requestedSize) {
                requestedSize = sizeKey();
                schedule(RESNAPSHOT_DEBOUNCE);
            }
        });
        resizeObserver.observe(card);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            resizeObserver.disconnect();
            engine.destroy();
            engineRef.current = null;
        };
    }, [active, scrollerRef, cardRef, initialOptions]);

    useEffect(() => {
        if (options) engineRef.current?.setOptions(options);
    });

    useEffect(() => {
        engineRef.current?.wake();
    }, [open]);

    if (!active) return null;
    // `fixed` + full viewport height; the engine sets left/width to match the
    // card's box every frame. w-0 until then so it can't flash over anything.
    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none fixed top-0 left-0 h-full w-0"
        />
    );
}
