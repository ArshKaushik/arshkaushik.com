// Figma component: "caseStudyCard" — an image slot with a serif title beneath.
// `dashed` turns on our custom 10px/10px dashes (see globals.css); `dash-b`
// draws the bottom edge. The first card also gets `dash-t` via the `isFirst`
// prop so it has a top edge too (markers stack). We can't use CSS `:first-child`
// here: the section's first child is the "Selected work" title, not a card.
export default function CaseStudyCard({
    title,
    isFirst = false,
}: {
    title: string;
    isFirst?: boolean;
}) {
    return (
        <article
            className={`flex h-[441px] w-full flex-col items-start gap-6 dashed dash-b bg-surface p-6 ${
                isFirst ? "dash-t" : ""
            }`}
        >
            {/* Figma: "thumbnail" — image slot. Drop a <Image /> here later. */}
            <div className="h-[296px] w-full bg-surface" />

            {/* Figma: "title&description" — pinned to the bottom of its box */}
            <div className="flex h-[73px] w-full flex-col items-start justify-end gap-2">
                <p className="w-full font-serif text-[24px] text-textPrimary">
                    {title}
                </p>
            </div>
        </article>
    );
}
