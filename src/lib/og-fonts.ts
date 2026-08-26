// Downloads the site's two typefaces as raw font bytes, so the Open Graph
// card generator can set its text in Instrument Serif and Geist instead of a
// generic fallback.
//
// WHY THIS IS NEEDED AT ALL: the cards are drawn by satori, the engine inside
// next/og's ImageResponse. satori is not a browser — it can't reuse the fonts
// next/font already serves to the real pages, because those are woff2 and
// satori can't parse that format. It has to be handed TrueType (.ttf) bytes
// directly, which is what this file goes and fetches.
//
// THE TRICK: Google Fonts' css2 endpoint chooses which format to serve based
// on the caller's User-Agent. A plain server-side fetch sends no modern
// browser User-Agent, so Google replies with truetype URLs instead of woff2 —
// exactly the format satori wants. The regex below pulls that URL out of the
// returned CSS, then a second fetch downloads the font file itself.
//
// WHEN: at BUILD time, because every route that calls this is prerendered.
// So it costs no network request per visitor.
//
// IF IT FAILS: every step is try/caught and returns null, so a build with no
// network access still succeeds — the cards just render in satori's own
// bundled font rather than breaking the deploy.
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
