import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import ClarityAnalytics from "@/components/Clarity";
import { identity, heroTagline, siteUrl } from "@/lib/content";
import { Analytics } from "@vercel/analytics/next";
import JsonLd from "@/components/JsonLd";
import { siteGraph } from "@/lib/structured-data";

const geist = Geist({
    variable: "--font-geist",
    subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
    variable: "--font-instrument-serif",
    weight: "400",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: `${identity.name} | ${identity.role}`,
    description: `${heroTagline}`,
    openGraph: {
        type: "website",
        siteName: identity.name,
        url: "/",
        title: `${identity.name} | ${identity.role}`,
        description: heroTagline,
    },
    twitter: {
        card: "summary_large_image",
        title: `${identity.name} | ${identity.role}`,
        description: heroTagline,
    },

    // Theme-aware favicon
    icons: {
        icon: [
            { url: "/favicon-light.png", type: "image/png", sizes: "96x96" }, // Default - light
            {   // Dark mode - overrides default when browser's prefers-color-scheme is dark.
                url: "/favicon-dark.png",
                media: "(prefers-color-scheme: dark)",
                type: "image/png",
                sizes: "96x96",
            },
        ],
    },
};

export default function RootLayout({
    children,
    modal,
}: Readonly<{
    children: React.ReactNode;
    // `modal` is a PARALLEL ROUTE slot (the app/@modal folder). It renders
    // alongside `children`, letting the case-study overlay layer on top of the
    // home page without the home unmounting. See app/@modal/*.
    modal: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${geist.variable} ${instrumentSerif.variable}`}
        >
            {/* suppressHydrationWarning: browser extensions (Grammarly,
                password managers, dark-mode extensions…) inject attributes
                into <body> before React hydrates, which would otherwise log
                spurious mismatch warnings. Scoped to this element only — it
                does NOT suppress warnings in children, so real hydration bugs
                elsewhere still surface. */}
            <body
                className="bg-page text-textPrimary font-sans antialiased"
                suppressHydrationWarning
            >
                {/* Skip link — the page's FIRST focusable element, so the
                    first Tab press offers keyboard users a jump past the
                    sidebar's five stops straight to the content (#content =
                    HomeContent's <main>). sr-only keeps it invisible until
                    focused; the pill styling only ever paints in that state. */}
                <a
                    href="#content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] dashed dash-x dash-y bg-surface p-4 text-[14px] text-textPrimary shadow-[0px_0px_16px_3px_rgba(17,17,17,0.06)]"
                >
                    Skip to content
                </a>
                <div className="flex min-h-screen items-start">
                    <Sidebar />
                    <div className="flex min-w-0 flex-1 items-start snap-gutter-r">
                        {children}
                    </div>
                </div>
                {modal}
                <ClarityAnalytics
                    projectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}
                />
                <Analytics />
                {/* schema.org Person + WebSite, in one @graph. Renders nothing.
                    Placed LAST in <body> deliberately: JSON-LD is valid anywhere
                    in the document, and putting it here keeps it well away from
                    the skip link above, which has to stay the first focusable
                    element. Defined once here so every page carries exactly one
                    Person, which case-study pages then reference by @id rather
                    than duplicating (see lib/structured-data.ts). */}
                <JsonLd data={siteGraph()} />
            </body>
        </html>
    );
}
