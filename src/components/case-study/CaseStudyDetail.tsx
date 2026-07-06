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

export default function CaseStudyDetail({ study }: { study: CaseStudy }) {
    return (
        <article className="flex w-[800px] max-w-full flex-col gap-8 dashed dash-x dash-y bg-surface p-8">
            {/* title + summary */}
            <div className="flex w-full flex-col gap-2">
                <h1 className="font-serif text-[28px] text-textPrimary">
                    {study.title}
                </h1>
                <p className="text-[14px] text-textSecondarySurface">
                    {renderInline(study.summary)}
                </p>
            </div>

            {/* Placeholder for an upcoming visual / animation (grey block). */}
            <div className="h-[394px] w-full bg-page" />

            {/* Metadata table — dashed box, dashed divider between rows. */}
            <dl className="flex w-full flex-col dashed dash-x dash-y">
                {study.meta.map((row, i) => (
                    <div
                        key={row.label}
                        className={`flex w-full items-start gap-3 p-6 ${
                            i < study.meta.length - 1 ? "dashed dash-b" : ""
                        }`}
                    >
                        <dt className="w-[120px] shrink-0 text-[14px] text-textPrimary">
                            {renderInline(row.label)}
                        </dt>
                        <dd className="flex-1 text-[14px] text-textSecondaryPage">
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
