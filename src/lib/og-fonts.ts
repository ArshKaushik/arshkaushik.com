// Font loading for the Open Graph images (opengraph-image.tsx files).
//
// satori — the engine behind next/og's ImageResponse — can't use the fonts
// next/font self-hosts for the page (those are woff2, which satori can't
// parse). So the OG generators fetch TTFs from Google Fonts at BUILD time
// (these routes are all prerendered): requesting the css2 endpoint WITHOUT a
// modern browser User-Agent makes Google serve truetype URLs instead of
// woff2. Everything is try/caught — if the network is unavailable at build,
// the images just render in satori's default font instead of failing the
// build.
async function loadGoogleFont(family: string): Promise<ArrayBuffer | null> {
    try {
        const css = await fetch(
            `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`,
        ).then((r) => (r.ok ? r.text() : ""));
        const url = css.match(
            /src:\s*url\((.+?)\)\s*format\(['"]?(?:truetype|opentype)['"]?\)/,
        )?.[1];
        if (!url) return null;
        const res = await fetch(url);
        return res.ok ? await res.arrayBuffer() : null;
    } catch {
        return null;
    }
}

export type OgFonts = {
    /** Instrument Serif — the display face (site headlines). null if fetch failed. */
    serif: ArrayBuffer | null;
    /** Geist — the UI face (site body). null if fetch failed. */
    sans: ArrayBuffer | null;
};

export async function loadOgFonts(): Promise<OgFonts> {
    const [serif, sans] = await Promise.all([
        loadGoogleFont("Instrument Serif"),
        loadGoogleFont("Geist"),
    ]);
    return { serif, sans };
}

/** Builds ImageResponse's `fonts` option from whatever actually loaded.
 *  Returns undefined when nothing loaded, which makes satori fall back to
 *  its bundled default font instead of erroring on an empty array. */
export function ogFontOptions(fonts: OgFonts) {
    const list = [
        fonts.serif && {
            name: "Instrument Serif",
            data: fonts.serif,
            weight: 400 as const,
            style: "normal" as const,
        },
        fonts.sans && {
            name: "Geist",
            data: fonts.sans,
            weight: 400 as const,
            style: "normal" as const,
        },
    ].filter(Boolean) as {
        name: string;
        data: ArrayBuffer;
        weight: 400;
        style: "normal";
    }[];
    return list.length > 0 ? list : undefined;
}
