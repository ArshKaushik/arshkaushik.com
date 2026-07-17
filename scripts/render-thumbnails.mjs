// Renders the case-study thumbnail WebPs from the SVG masters in
// public/thumbnails/ — one file per size the layout actually draws, so the
// browser always paints device pixels 1:1 from a file rendered at exactly
// that size. No resize ever happens after the vector render: librsvg (via
// sharp's density option) rasterizes the SVG natively at each target width,
// and the only post-step is a ≤2px vertical center-crop for the detail-hero
// aspect. History of why this exists (two generations of thumbnail blur):
// learn/svg-thumbnail-blur.md.
//
// Run with: pnpm thumbs
//
// The size ladder is derived from the two render surfaces:
// - Home card (CaseStudyCard): box is a fixed 296px CSS tall with
//   object-cover, so the image is DRAWN at 552x296 CSS at every viewport
//   width (narrower boxes just crop the right edge). Targets are exact
//   1x/2x/3x multiples of the SVG's 552x296 viewBox — no cropping at all.
// - Detail hero (CaseStudyDetail): box is aspect-[736/394] at widths
//   736px (>900px viewports), 536px (600-900px), fluid below 600px.
//   Targets cover 736 at 1x/2x/3x plus 536 at 2x (iPad portrait) exactly;
//   fluid phone widths take the next-larger file with a single browser
//   downscale, which is unavoidable for fluid layouts. 736:394 is a hair
//   shorter than the SVG's own aspect (394.67 at that width), hence the
//   tiny crop.
import path from "node:path";
import sharp from "sharp";

const DIR = "public/thumbnails";
const STUDIES = ["commandLine", "connectorConfig", "designSystem"];
const VIEWBOX_WIDTH = 552; // all three masters share width=552 height=296

const TARGETS = [
    { w: 552, h: 296, surface: "card 1x" },
    { w: 1104, h: 592, surface: "card 2x" },
    { w: 1656, h: 888, surface: "card 3x" },
    { w: 736, h: 394, surface: "detail 1x" },
    { w: 1072, h: 574, surface: "detail 2x @ 536px tier" },
    { w: 1472, h: 788, surface: "detail 2x" },
    { w: 2208, h: 1182, surface: "detail 3x" },
];

// Near-lossless WebP: measured smaller than lossy quality-90 on all three
// masters at 1104px (39-47KB vs 39-59KB) AND visually transparent — this
// flat-color, hairline-heavy UI art is near-lossless's ideal case. quality
// here is the near-lossless preprocessing level, not lossy quality.
const WEBP_OPTIONS = { nearLossless: true, quality: 60, effort: 6 };

let totalBytes = 0;
const rows = [];

for (const study of STUDIES) {
    const src = path.join(DIR, `${study}.svg`);
    for (const { w, h, surface } of TARGETS) {
        // Rasterize the vectors natively at the target width. sharp reads
        // SVG at 72dpi by default, so density scales linearly from there.
        const density = (72 * w) / VIEWBOX_WIDTH;
        const { data, info } = await sharp(src, { density })
            .raw()
            .toBuffer({ resolveWithObject: true });

        if (info.width !== w || info.height < h) {
            throw new Error(
                `${src} at density ${density}: rendered ${info.width}x${info.height}, ` +
                    `cannot produce ${w}x${h} without resampling`,
            );
        }

        // Vertical center-crop to the surface's exact aspect (a no-op for
        // the card sizes, ≤2px for the detail sizes). extract() is a pure
        // crop — the pixels rendered above are written out untouched.
        const out = path.join(DIR, `${study}-${w}.webp`);
        const { size, width, height } = await sharp(data, {
            raw: { width: info.width, height: info.height, channels: info.channels },
        })
            .extract({ left: 0, top: Math.floor((info.height - h) / 2), width: w, height: h })
            .webp(WEBP_OPTIONS)
            .toFile(out);

        if (width !== w || height !== h) {
            throw new Error(`${out}: wrote ${width}x${height}, expected ${w}x${h}`);
        }
        totalBytes += size;
        rows.push({ file: `${study}-${w}.webp`, dims: `${w}x${h}`, kb: (size / 1024).toFixed(1), surface });
    }
}

for (const r of rows) {
    console.log(`${r.file.padEnd(28)} ${r.dims.padEnd(10)} ${String(r.kb).padStart(7)} KB  ${r.surface}`);
}
console.log(`\n${rows.length} files, ${(totalBytes / 1024).toFixed(0)} KB total`);
