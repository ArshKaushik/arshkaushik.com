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
// The whole card dissolves — surface and border included — so the page
// behind it shows through the dust. The live card DOM is never replaced or
// moved: this component adds one decorative, viewport-sized <canvas> on top
// (aria-hidden, pointer-events: none), and the engine hides the part of the
// real card that's dust with a CSS mask, which is visual only. So clicks,
// text selection, wheel scrolling and screen readers all still reach the
// real card. Once everything has landed the mask comes off (engine.ts).
//
// The steps:
//   1. Create the WebGL engine (no WebGL2 → render nothing, plain card).
//   2. Take a snapshot of the card (snapshot.ts) straight away — a quick one,
//      then a full one if some images weren't downloaded yet — and hand it
//      to the engine. Until the first arrives: plain card.
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

// After a resize, wait for it to stop before re-snapshotting (a window drag
// fires dozens of resizes). The FIRST snapshot doesn't wait at all: it runs
// while the card is still sliding up. That slide is a CSS transition the
// browser runs off the main thread, so the snapshot's JS work doesn't stall
// it — and the effect is ready by the time the reader can scroll.
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

        // Two passes. A QUICK snapshot first, which skips any image that
        // hasn't downloaded yet (usually the far-down point-card images), so
        // the effect can start right away. If anything was skipped, a FULL
        // snapshot follows once every image is in, and quietly replaces the
        // first — the skipped images are far below the fold, so by the time
        // the reader gets there, their grains are the real thing.
        const take = async () => {
            const current = ++generation;
            requestedSize = sizeKey();
            const stale = () => cancelled || current !== generation;
            try {
                for (const quick of [true, false]) {
                    const snapshot = await snapshotCard(
                        card,
                        engine.maxTextureSize,
                        { quick },
                    );
                    if (stale()) {
                        snapshot.canvas.width = snapshot.canvas.height = 0;
                        return;
                    }
                    if (process.env.NODE_ENV !== "production") {
                        console.debug(
                            `[particle-scroll] ${quick ? "quick" : "full"} snapshot ${Math.round(snapshot.ms)}ms at ${snapshot.scale.toFixed(2)}x (${snapshot.width.toFixed(0)}x${snapshot.height.toFixed(0)} CSS px)${snapshot.complete ? "" : ", some images skipped"}`,
                        );
                    }
                    const complete = snapshot.complete;
                    engine.setSnapshot(snapshot);
                    if (complete) break;
                }
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
        take();

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
    // `fixed` + full viewport height; the engine sets its width to the
    // dialog's visible width. w-0 until then so it can't flash over anything.
    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none fixed top-0 left-0 h-full w-0"
        />
    );
}
