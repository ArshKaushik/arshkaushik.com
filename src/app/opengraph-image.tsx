import { ImageResponse } from "next/og";
import { identity, heroTagline } from "@/lib/content";
import { loadOgFonts, ogFontOptions } from "@/lib/og-fonts";

// The og:image for the home page — what a pasted arshkaushik.com link unfurls
// as on LinkedIn/Slack/iMessage. Next's file convention: this route renders a
// PNG at build time and the matching <meta property="og:image"> tags are
// injected automatically (metadataBase in layout.tsx makes the URL absolute).
//
// The design reuses the site's own tokens: page grey behind a white surface
// card with a dashed stroke, Instrument Serif for the tagline, Geist for the
// meta lines. satori (the renderer) supports dashed borders, but not the
// custom 10/10 dash rhythm — the standard dashed border is the closest match.

export const alt = `${identity.name} — ${identity.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
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
                        {`${identity.name} · ${identity.role}`}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 62,
                            lineHeight: 1.15,
                            color: "#000000",
                            fontFamily: fonts.serif ? "Instrument Serif" : undefined,
                        }}
                    >
                        {heroTagline}
                    </div>
                    <div style={{ display: "flex", fontSize: 24, color: "#767676" }}>
                        arshkaushik.com
                    </div>
                </div>
            </div>
        ),
        { ...size, fonts: ogFontOptions(fonts) },
    );
}
