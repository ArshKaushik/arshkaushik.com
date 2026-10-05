import { aboutHeading, aboutParagraphs } from "@/lib/about";
import SurfaceCard from "@/components/ui/SurfaceCard";
import DisplayHeading from "@/components/ui/DisplayHeading";

export default function AboutIntro() {
    return (
        <section className="w-full">
            <SurfaceCard className="dash-y gap-9">
                <div className="flex w-full flex-col gap-5">
                    <DisplayHeading>{aboutHeading}</DisplayHeading>

                    {/* leading-[17px]: Figma's "Auto" line-height for 14px
                        Geist measures 17px, but the browser's `normal` for the
                        same font resolves to 18px, so it's pinned. gap-[1lh]:
                        Figma separates paragraphs with one empty line of the
                        same text; 1lh is exactly one line-height. */}
                    <div className="flex w-full flex-col gap-[1lh] text-[14px] leading-[17px] text-textPrimary">
                        {aboutParagraphs.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                    </div>
                </div>

                {/* Decorative: the name is already on the page, so alt="" keeps
                    screen readers from announcing it twice. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> like every other image on the site; next/image's resampler isn't used */}
                <img
                    src="/about/signature.svg"
                    alt=""
                    width={114}
                    height={40}
                    className="block h-auto"
                />
            </SurfaceCard>
        </section>
    );
}
