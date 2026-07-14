import { readFileSync } from "fs";
import path from "path";

// Reads one of our own trusted, hand-authored SVGs from /public and adapts
// its root <svg> tag for inline embedding: stretches it to 100%/100% of its
// container (instead of its native pixel size) and sets preserveAspectRatio
// to crop it the way CSS object-fit:cover would for an <img>.
//
// WHY INLINE AND NOT next/image: next.config.ts has no `images.dangerouslyAllowSVG`
// override, so next/image forces `unoptimized` for any .svg source, which
// renders a bare <img src="*.svg"> with no responsive srcset. On mobile
// WebKit (Safari AND Chrome-on-iOS, both WebKit under the hood) that plain
// <img>-tag SVG decode/raster path renders these particular thumbnails
// (large, filter-heavy illustrations) visibly blurry — confirmed by
// comparing the identical file via <img> vs. inline <svg> in real WebKit.
// Inline <svg> is drawn as native vector geometry with no raster-decode step
// to go wrong, and was crisp in every condition tested.
//
// role="presentation" aria-hidden="true" on the injected root tag: the
// caller wraps this in an element carrying role="img"/aria-label, so the
// raw SVG internals should be hidden from the accessibility tree rather
// than exposing their own (nonexistent) accessible name.
export function getInlineSvg(publicPath: string, preserveAspectRatio: string): string {
    const filePath = path.join(process.cwd(), "public", publicPath);
    const raw = readFileSync(filePath, "utf8");

    return raw.replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
        const stripped = attrs
            .replace(/\s*width="[^"]*"/, "")
            .replace(/\s*height="[^"]*"/, "");
        return `<svg${stripped} width="100%" height="100%" preserveAspectRatio="${preserveAspectRatio}" role="presentation" aria-hidden="true">`;
    });
}
