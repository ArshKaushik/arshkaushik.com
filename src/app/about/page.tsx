import type { Metadata } from "next";
import { identity } from "@/lib/content";
import { aboutParagraphs } from "@/lib/about";
import PageColumn from "@/components/layout/PageColumn";
import AboutIntro from "@/components/sections/AboutIntro";
import Footer from "@/components/sections/Footer";
import JsonLd from "@/components/JsonLd";
import { aboutPageSchema } from "@/lib/structured-data";

const title = `About | ${identity.name}`;
// The page's own opening paragraph doubles as its search/share description.
const description = aboutParagraphs[0];
// Metadata merges shallowly: defining openGraph/twitter here replaces the
// root's, including the share image app/opengraph-image.png supplies. So the
// same card is named explicitly (alt matches opengraph-image.alt.txt).
const shareImage = {
    url: "/opengraph-image.png",
    width: 1200,
    height: 630,
    alt: `${identity.name} — ${identity.role}`,
};

export const metadata: Metadata = {
    title,
    description,
    openGraph: {
        title,
        description,
        url: "/about",
        type: "profile",
        images: [shareImage],
    },
    twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [shareImage],
    },
};

export default function AboutPage() {
    return (
        <>
            <PageColumn>
                <AboutIntro />
                <Footer />
            </PageColumn>
            <JsonLd data={aboutPageSchema()} />
        </>
    );
}
