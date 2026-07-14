import type { CaseStudy, CaseStudyPoint } from "@/lib/case-studies";

// The case-study content card (Figma node 273-440). Presentational + reused by
// BOTH the overlay (app/@modal) and the full page (app/work/[slug]).
//
// Renders a stored content string. The copy uses light inline markdown: the
// design shows prose without emphasis, so `**bold**` / `*italic*` are stripped —
// BUT markdown links `[text](url)` become real, new-tab anchors. That's why this
// returns React nodes instead of a string: a bare string can't carry an <a>.
// A field with no link just yields its stripped text, exactly as before.
const renderInline = (s: string): React.ReactNode => {
    const stripEmphasis = (t: string) =>
        t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");

    // Matches [visible text](url) — the standard markdown link form.
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const nodes: React.ReactNode[] = [];
    let cursor = 0; // index of the first char we haven't emitted yet
    let key = 0;
    let match: RegExpExecArray | null;

    while ((match = linkPattern.exec(s)) !== null) {
        // Plain (emphasis-stripped) text sitting before this link.
        if (match.index > cursor) {
            nodes.push(stripEmphasis(s.slice(cursor, match.index)));
        }
        const [, text, url] = match;
        nodes.push(
            <a
                key={key++}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-textPrimary"
            >
                {text}
            </a>,
        );
        cursor = match.index + match[0].length;
    }
    // Remaining text after the last link (or the whole string if there were none).
    if (cursor < s.length) nodes.push(stripEmphasis(s.slice(cursor)));

    // Collapse the common no-link case back to a single text node.
    return nodes.length === 1 ? nodes[0] : nodes;
};

export default function CaseStudyDetail({
    study,
    thumbnailSvg,
}: {
    study: CaseStudy;
    // Pre-rendered inline <svg> markup (see inline-svg.ts). Computed by the
    // caller rather than here: this component is rendered by CaseStudyOverlay,
    // a "use client" component, and Node's `fs` (used to read the SVG file)
    // can't be bundled for the browser — see learn/svg-thumbnail-blur.md.
    thumbnailSvg?: string | false;
}) {
    return (
        <article className="flex w-[800px] min-w-0 max-w-full flex-col gap-8 dashed dash-x dash-y bg-surface p-4 min-[600px]:p-8">
            {/* title + summary */}
            <div className="flex w-full flex-col gap-2">
                <h1 className="font-serif text-[28px] text-textPrimary">
                    {study.title}
                </h1>
                <p className="text-[14px] text-textSecondarySurface">
                    {renderInline(study.summary)}
                </p>
            </div>

            {/* Visual: the study's thumbnailCover (same SVG as the home card),
                cropped to fill; an empty grey block until set. Rendered as
                inline <svg> (not next/image) — see inline-svg.ts for why.
                aspect-[736/394] (not a fixed height): 736 = the article's
                content width at its original 800px/p-8 size (800-64), so this
                ratio reproduces the exact desktop height (394px) at that
                width AND scales correctly at any narrower width the article
                shrinks to — verified against Figma 540:90180 (370 wide,
                198.07 tall at 402px: 198.07/370 = 394/736 to 5 significant
                figures). Applies at every breakpoint, not just this one. */}
            <div className="relative aspect-[736/394] w-full overflow-hidden bg-page">
                {thumbnailSvg && (
                    <div
                        role="img"
                        aria-label={study.title}
                        className="absolute inset-0"
                        dangerouslySetInnerHTML={{ __html: thumbnailSvg }}
                    />
                )}
            </div>

            {/* Metadata table — dashed box, dashed divider between rows.
                Below 600px (not the Figma design's nominal 480px handoff —
                see snap-center-x's comment in globals.css for why 600 is the
                real floor) each row stacks label-above-value (Figma
                540:90180's stat rows show this), matching gap-2; at 600px+
                it's the original side-by-side dt/dd row, unchanged. */}
            <dl className="flex w-full flex-col dashed dash-x dash-y">
                {study.meta.map((row, i) => (
                    <div
                        key={row.label}
                        className={`flex w-full flex-col items-start gap-2 p-6 min-[600px]:flex-row min-[600px]:items-start min-[600px]:gap-3 ${
                            i < study.meta.length - 1 ? "dashed dash-b" : ""
                        }`}
                    >
                        <dt className="w-full shrink-0 text-[14px] text-textPrimary min-[600px]:w-[120px]">
                            {renderInline(row.label)}
                        </dt>
                        <dd className="w-full text-[14px] text-textSecondaryPage min-[600px]:flex-1">
                            {renderInline(row.value)}
                        </dd>
                    </div>
                ))}
            </dl>

            {/* Company / context paragraph (same across studies). */}
            <p className="text-[14px] text-textSecondarySurface">
                {renderInline(study.context)}
            </p>

            <Section heading="The Problem">
                <p className="text-[14px] text-textSecondarySurface">
                    {renderInline(study.problem)}
                </p>
            </Section>

            <Section heading="The Real Problem">
                <p className="text-[14px] text-textSecondarySurface">
                    {renderInline(study.realProblem)}
                </p>
            </Section>

            <Section heading="What I did">
                {study.whatIDid.map((point) => (
                    <Point key={point.lead} point={point} />
                ))}
            </Section>

            <Section heading="Impact">
                {study.impact.map((point) => (
                    <Point key={point.lead} point={point} />
                ))}
            </Section>

            <Section heading="The Hardest Call">
                <p className="text-[14px] text-textSecondarySurface">
                    {renderInline(study.hardestCall)}
                </p>
            </Section>
        </article>
    );
}

// A titled section: 20px heading + its body/children, 8px apart.
function Section({
    heading,
    children,
}: {
    heading: string;
    children: React.ReactNode;
}) {
    return (
        <section className="flex w-full flex-col gap-2">
            <h2 className="text-[20px] text-textPrimary">{heading}</h2>
            {children}
        </section>
    );
}

// A "What I did" / "Impact" item: black lead-in span + grey body span, no bullet.
function Point({ point }: { point: CaseStudyPoint }) {
    return (
        <p className="text-[14px] text-textSecondarySurface">
            <span className="text-textPrimary">{renderInline(point.lead)}</span>
            {point.body ? <> {renderInline(point.body)}</> : null}
        </p>
    );
}
