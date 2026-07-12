import Link from "next/link";
import Image from "next/image";

// Figma component: "caseStudyCard" — an image slot with a serif title beneath.
// The whole card is a Link to /work/[slug]; clicking it opens that study's
// detail overlay (see src/app/@modal). `group` on the Link lets the inner
// title/description react to the WHOLE card being hovered via `group-hover:*`.
//
// On hover (Figma "State=Hovered") the title slides UP and a description fades
// in beneath it, using the "Gentle" spring easing (see --ease-spring-gentle in
// globals.css).
//
// `dashed` turns on our custom 10px/10px dashes (see globals.css); `dash-b`
// draws the bottom edge. The first card also gets `dash-t` via the `isFirst`
// prop so it has a top edge too (markers stack). We can't use CSS `:first-child`
// here: the section's first child is the "Selected work" title, not a card.
export default function CaseStudyCard({
    slug,
    title,
    description,
    thumbnailCover,
    isFirst = false,
}: {
    slug: string;
    title: string;
    description: string;
    thumbnailCover?: string;
    isFirst?: boolean;
}) {
    return (
        <Link
            href={`/work/${slug}`}
            className={`group flex h-[441px] w-full flex-col items-start gap-6 dashed dash-b bg-surface p-6 ${
                isFirst ? "dash-t" : ""
            }`}
        >
            {/* Figma: "thumbnail" — image slot. Shows the study's thumbnailCover
                image, cropped to fill via object-cover; an empty box until set.
                `fill` needs a positioned, sized parent → relative + h/w + overflow. */}
            <div className="relative h-[296px] w-full overflow-hidden bg-surface">
                {thumbnailCover && (
                    <Image
                        src={thumbnailCover}
                        alt={`${title} preview`}
                        fill
                        sizes="600px"
                        // draggable={false} = the reliable, cross-browser way to
                        // block dragging the image out. The [-webkit-user-drag:none]
                        // class hardens it on WebKit/Blink (Chrome/Safari/Edge).
                        draggable={false}
                        className="object-cover select-none [-webkit-user-drag:none]"
                    />
                )}
            </div>

            {/* Figma: "title&description".
                `relative` makes this box the positioning context for the
                description below (which is `absolute`). The title stays in normal
                flow, pinned to the bottom by `justify-end`; on hover it slides up
                to reveal the description. The 8px gap between them is produced by
                how far the title rises: the description sits pinned at the bottom
                (height 42px), and the title lifts by (42 + 8) = 50px, leaving
                exactly 8px below it. NOTE: 50px is tied to the current 2-line
                (42px) descriptions — a longer/shorter description would change the
                needed offset (a real flex `gap-2` would be sturdier if copy varies).

                Below 900px there's no hover to reveal it with (touch), so the
                description stays permanently visible/shifted — the min-[900px]:
                variants below are what re-gate it behind group-hover at desktop
                widths. */}
            <div className="relative flex h-[73px] w-full flex-col items-start justify-end">
                {/* DESCRIPTION — always visible below 900px; fades in on hover
                    (opacity 0 → 1) at a fixed spot at >=900px. It's `absolute` so
                    it never pushes the title. */}
                <p className="absolute bottom-0 left-0 w-full font-sans text-[14px] text-textSecondarySurface opacity-100 transition duration-[511ms] ease-spring-gentle motion-reduce:transition-none min-[900px]:opacity-0 min-[900px]:group-hover:opacity-100">
                    {description}
                </p>

                {/* TITLE — always shifted up below 900px (to stay open above the
                    always-visible description); slides up 50px on hover at
                    >=900px instead, with the gentle spring (watch the slight
                    overshoot). */}
                <p className="w-full -translate-y-[50px] font-serif text-[24px] text-textPrimary transition duration-[511ms] ease-spring-gentle motion-reduce:transition-none min-[900px]:translate-y-0 min-[900px]:group-hover:-translate-y-[50px]">
                    {title}
                </p>
            </div>
        </Link>
    );
}
