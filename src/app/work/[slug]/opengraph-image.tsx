import { ImageResponse } from "next/og";
import { caseStudies } from "@/lib/case-studies";
import { identity } from "@/lib/content";
import { loadOgFonts, ogFontOptions } from "@/lib/og-fonts";

// The og:image for a shared /work/<slug> link — the preview card that unfurls
// in LinkedIn, Slack or iMessage. One per case study, titled with that study.
//
// The wiring is the FILENAME, not a metadata field: `opengraph-image` is one
// of Next's reserved file conventions, so Next makes this the og:image for the
// sibling page.tsx route and emits the <meta property="og:image"> tag itself.
// Nothing imports this file — renaming it silently removes the preview.
//
// generateStaticParams mirrors the page's, so all three cards are rendered
// once at build time (prerendered) rather than on each request.
//
// The card is drawn by satori, the engine inside next/og's ImageResponse.
// satori supports `border: dashed` but not the custom 10/10 dash rhythm used
// across the site, so the border below is its standard approximation rather
// than a match for the real thing.

export const alt = `Case study — ${identity.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
    return caseStudies.map((study) => ({ slug: study.slug }));
}

export default async function OpenGraphImage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const study = caseStudies.find((c) => c.slug === slug);
    const fonts = await loadOgFonts();
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f4f4f4",
                    fontFamily: fonts.sans ? "Geist" : undefined,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 28,
                        width: 1048,
                        padding: "72px 80px",
                        backgroundColor: "#ffffff",
                        border: "2px dashed #d8d8d8",
                    }}
                >
                    <div style={{ display: "flex", fontSize: 28, color: "#767676" }}>
                        {`${identity.name} · Case study`}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 60,
                            lineHeight: 1.15,
                            color: "#000000",
                            fontFamily: fonts.serif ? "Instrument Serif" : undefined,
                        }}
                    >
                        {study?.title ?? "Selected work"}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 26,
                            lineHeight: 1.4,
                            color: "#767676",
                        }}
                    >
                        {study?.subtitle ?? "arshkaushik.com"}
                    </div>
                </div>
            </div>
        ),
        { ...size, fonts: ogFontOptions(fonts) },
    );
}
