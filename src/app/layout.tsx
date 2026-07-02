import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
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
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
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
                    <div className="flex flex-1 items-start justify-center pr-[260px]">
                        {children}
                    </div>
                </div>
            </body>
        </html>
    );
}
