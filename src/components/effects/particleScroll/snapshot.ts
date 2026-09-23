import type { CardSnapshot } from "./engine";

// Takes a picture of the card for the particle effect to sample.
//
// HOW: modern-screenshot clones the element, inlines every computed style,
// embeds its images and web fonts as data: URLs, wraps the lot in an SVG
// <foreignObject>, and draws that SVG into a canvas. Every current browser
// can draw HTML-inside-SVG to a canvas — no flags, unlike HTML-in-Canvas.
//
// WHY modern-screenshot over html-to-image: it's the maintained successor
// (html-to-image's last release was 2025), it only embeds the @font-face
// rules the element actually uses (html-to-image inlines every font on the
// page), and it already works around WebKit's main foreignObject quirk —
// Safari draws an SVG before its embedded images/fonts have decoded, so the
// library redraws it a few times on a short interval (`drawImageInterval`)
// instead of us having to call it repeatedly. The trade: it's roughly twice
// the size (~10 KB vs ~5 KB minified + gzipped), which is why it's loaded
// on demand below rather than bundled into the page.

// Safari refuses to create a canvas bigger than ~16.7 million pixels
// (4096 x 4096) on iOS; anything larger silently draws nothing. The card
// is ~800 x 3400 CSS px, which at 2x is ~10.9M — under the cap — but a
// narrow phone layout is taller, so scale down rather than fail if needed.
const MAX_CANVAS_PIXELS = 16_000_000;

// How long the library waits between those Safari redraws. Its default is
// 100ms, once per embedded image/font — ~1.2s on the design-system card.
// 16ms (one frame) gave a pixel-identical WebKit snapshot in testing, at
// ~0.5s. Turning the redraws off entirely did NOT: images came out wrong.
const SAFARI_REDRAW_INTERVAL = 16;

// Point-card images are loading="lazy", so the ones far down the card
// haven't loaded when the overlay opens. For the FULL snapshot we flip them
// to eager and wait for every image. This only changes WHEN those images
// load, not what's rendered. A failed image resolves rather than rejects:
// the snapshot just shows its empty grey well.
async function loadImages(images: HTMLImageElement[]) {
    await Promise.all(
        images.map((img) => {
            if (img.loading === "lazy") img.loading = "eager";
            if (img.complete) return img.decode().catch(() => {});
            return new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
            }).then(() => img.decode().catch(() => {}));
        }),
    );
}

/**
 * `quick: true` doesn't wait for images that haven't loaded yet — they're
 * left out of the picture (their grey wells show instead), so the effect can
 * start almost immediately. `complete` in the result says whether anything
 * was left out, i.e. whether a full snapshot should follow.
 */
export async function snapshotCard(
    card: HTMLElement,
    maxTextureSize: number,
    { quick }: { quick: boolean },
): Promise<CardSnapshot & { ms: number; scale: number; complete: boolean }> {
    // Web fonts first: a snapshot taken before Instrument Serif / Geist have
    // loaded would bake the fallback font into every grain.
    await document.fonts.ready;
    const images = Array.from(card.querySelectorAll("img"));
    if (quick) {
        // Decode what's already downloaded; leave the rest alone (a lazy
        // image that hasn't started loading is skipped by the library's own
        // "wait for images" step, so it can't hold the snapshot up).
        await Promise.all(
            images.filter((img) => img.complete).map((img) =>
                img.decode().catch(() => {}),
            ),
        );
    } else {
        await loadImages(images);
    }
    const missing = new Set(images.filter((img) => !img.complete));
    // Loaded on demand, so the library never ships to visitors who don't get
    // the effect (reduced motion, no WebGL) — it isn't in the page bundle.
    const { createContext, domToCanvas } = await import("modern-screenshot");

    const started = performance.now();
    // getBoundingClientRect, not offsetWidth: it keeps fractional pixels,
    // and the engine compares this size against the live card later.
    // (The slide-up transform doesn't change width/height, only position.)
    const { width, height } = card.getBoundingClientRect();
    // Same pixel density as the effect canvas (device pixels, capped at 2x),
    // then shrunk only if the GPU or Safari's canvas cap would refuse it.
    const scale = Math.min(
        Math.min(window.devicePixelRatio || 1, 2),
        maxTextureSize / width,
        Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
    );
    // Before anything else, the library waits for every <img> inside the
    // card to finish loading — including the ones we're about to leave out,
    // which (being lazy and far away) may not load for a long time. Its only
    // knob for that wait is `timeout`, which ALSO limits every later step. So
    // the context is created with a tiny timeout (that initial wait gives up
    // on the skipped images almost at once), then the timeout is raised
    // before the real work — fetching fonts, drawing the SVG — begins.
    const context = await createContext(card, {
        width,
        height,
        scale,
        timeout: quick ? 50 : 15000,
        drawImageInterval: SAFARI_REDRAW_INTERVAL,
        // Leaving an unloaded <img> out doesn't shift the layout: every image
        // sits in a wrapper whose aspect-ratio fixes its size.
        filter: (node) =>
            !(node instanceof HTMLImageElement && missing.has(node)),
        // Every snapshot after the first is taken while the effect is
        // running, i.e. while the engine's mask is hiding the lower part of
        // the live card. The library copies computed styles, mask included,
        // so without this the picture itself would come out transparent
        // below the cut. These override the cloned card only, not the page.
        style: { maskImage: "none", webkitMaskImage: "none" },
        // Free the library's scratch resources as soon as the SVG is built,
        // same as a plain domToCanvas(card, options) call would.
        autoDestruct: true,
    });
    context.timeout = 15000;
    const canvas = await domToCanvas(context);
    return {
        canvas,
        width,
        height,
        scale,
        ms: performance.now() - started,
        complete: missing.size === 0,
    };
}
