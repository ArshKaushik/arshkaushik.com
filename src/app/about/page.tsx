import type { Metadata } from "next";
import { identity } from "@/lib/content";

// Placeholder — the real About page design hasn't been handed off yet. This
// exists so the sidebar's new "About" link has somewhere to go instead of
// 404ing; replace this whole file once that design ships.
export const metadata: Metadata = {
    title: `About | ${identity.name}`,
};

export default function AboutPage() {
    return (
        <main
            id="content"
            className="flex min-h-screen w-full flex-col items-start gap-2 p-6"
        >
            <h1 className="font-serif text-[28px] text-textPrimary">About</h1>
            <p className="text-[14px] text-textSecondaryPage">
                More coming soon.
            </p>
        </main>
    );
}
