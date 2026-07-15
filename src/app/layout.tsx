import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import ClarityAnalytics from "@/components/Clarity";
import { identity, heroTagline } from "@/lib/content";
import { Analytics } from "@vercel/analytics/next";

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
    // Base for resolving every relative URL below (and the og:image URLs the
    // opengraph-image.tsx file convention generates) into absolute ones —
    // social crawlers reject relative URLs.
    metadataBase: new URL("https://arshkaushik.com"),
    title: `${identity.name} | ${identity.role}`,
    description: `${heroTagline}`,
    // Open Graph + Twitter cards: without these, a pasted link (LinkedIn DM,
    // job application, Slack) unfurls as a bare URL with no preview — the
    // worst possible first impression for a portfolio distributed via links.
    // The image itself comes from src/app/opengraph-image.tsx (and the
    // per-study variant under work/[slug]/) — Next injects those og:image
    // tags automatically, so no `images` field is needed here.
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
    // Theme-aware favicon. Next renders these as <link rel="icon"> tags.
    // The browser only exposes a coarse light/dark preference
    // (prefers-color-scheme), which we map to the two icons:
    icons: {
        icon: [
            // Default = the light-mode icon. Also the fallback for browsers that
            // report no colour preference or don't honour `media` on icons.
            { url: "/favicon-light.png", type: "image/png", sizes: "96x96" },
            // Dark mode overrides it: this link both matches AND comes last, so
            // the browser picks it when prefers-color-scheme is dark.
            {
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
            </body>
        </html>
    );
}
