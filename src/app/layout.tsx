import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import ClarityAnalytics from "@/components/Clarity";
import { identity, heroTagline } from "@/lib/content";

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
    title: `${identity.name} | ${identity.role}`,
    description: `${heroTagline}`,
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
            <body
                className="bg-page text-textPrimary font-sans antialiased"
                suppressHydrationWarning
            >
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
            </body>
        </html>
    );
}
