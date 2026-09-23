import type { CardSnapshot } from "./engine";

// Takes a one-time picture of the card for the particle effect to sample.
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

// Point-card images are loading="lazy", so any that haven't scrolled near
// the viewport yet haven't loaded — and modern-screenshot waits for every
// <img> inside the element to finish loading first (up to its timeout,
// 30s by default). The snapshot is going to download them anyway, so flip
// them to eager up front and wait for them ourselves. This only changes
// WHEN those images load, not what's rendered. A failed image resolves
// rather than rejects: the snapshot just shows the empty grey well.
async function loadImages(root: HTMLElement) {
    const images = Array.from(root.querySelectorAll("img"));
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

export async function snapshotCard(
    card: HTMLElement,
    maxTextureSize: number,
): Promise<CardSnapshot & { ms: number; scale: number }> {
    // Web fonts first: a snapshot taken before Instrument Serif / Geist have
    // loaded would bake the fallback font into every grain.
    await document.fonts.ready;
    await loadImages(card);
    // Loaded on demand, so the library never ships to visitors who don't get
    // the effect (reduced motion, no WebGL) — it isn't in the page bundle.
    const { domToCanvas } = await import("modern-screenshot");

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
    const canvas = await domToCanvas(card, {
        width,
        height,
        scale,
        timeout: 15000,
    });
    return { canvas, width, height, scale, ms: performance.now() - started };
}
