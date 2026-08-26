import Link from "next/link";

// Figma component: "caseStudyCard" — an image slot with a serif title beneath.
// The whole card is a Link to /work/[slug]; clicking it opens that study's
// detail overlay (see src/app/@modal).
//
// `group` is Tailwind's parent-hover pattern: naming this Link the `group`
// lets its descendants react to the WHOLE card being hovered through
// `group-hover:*` utilities. Plain CSS :hover can't express that — it only
// matches the element actually under the cursor, not "my ancestor is hovered".
//
// `active:opacity-70` gives an INSTANT pressed acknowledgment on click — the
// overlay route renders on the server, so without it the click feels dead
// until that response arrives.
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
    thumbnail,
    isFirst = false,
}: {
    slug: string;
    title: string;
    description: string;
    // Path to the study's thumbnail under /public (see CaseStudy.thumbnail).
    thumbnail?: string;
    isFirst?: boolean;
}) {
    return (
        <Link
            href={`/work/${slug}`}
            className={`group flex h-auto w-full flex-col items-start gap-6 dashed dash-b bg-surface p-6 transition-opacity active:opacity-70 min-[600px]:h-[441px] ${
                isFirst ? "dash-t" : ""
            }`}
        >
            {/* Figma: "thumbnail" — image slot. Shows the study's thumbnail,
                cropped to fill; an empty box until set (bg-surface matches the
                card, so an unset thumbnail is invisible rather than a hole).
                Keep h-[296px]: the card's min-[600px]:h-[441px] above is
                arithmetically bound to it (296 + 24 gap + 73 text + 48 pad).
                object-cover makes the image fill the box and crop whatever
                doesn't fit (rather than squashing to fit), and object-left
                sets WHERE that crop is anchored. Left, not the default
                centre: per Figma the image stays pinned to the LEFT edge as
                the card narrows across breakpoints, so the same content is
                always visible and only the right side crops progressively —
                a centre-crop would shave both edges as the container resizes.
                (This is what preserveAspectRatio="xMinYMid slice" did while
                the thumbnail was an inline <svg>.)
                overflow-hidden on the wrapper is what actually clips it.
                The first card is the home page's LCP candidate — Largest
                Contentful Paint, the Core Web Vitals metric for when the
                biggest visible element finishes loading — so it loads eagerly
                at high priority to keep that score down; the rest stay lazy
                so they don't compete for bandwidth. */}
            <div className="relative h-[296px] w-full overflow-hidden bg-surface">
                {thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element -- next/image is the resampler we removed; sharp is a devDependency so it isn't available at runtime anyway
                    <img
                        src={thumbnail}
                        alt=""
                        loading={isFirst ? "eager" : "lazy"}
                        fetchPriority={isFirst ? "high" : "auto"}
                        decoding="async"
                        className="block size-full object-cover object-left"
                    />
                )}
            </div>

            {/* Figma: "title&description". Three tiers now (600px, not the
                Figma design's nominal 480px handoff — see snap-center-x's
                comment in globals.css for why 600 is the real, arithmetic-
                forced floor for every "restore part 2" breakpoint):
                - below 600px: normal auto-height flow. Title then description
                  just stack. order-first/order-last are flexbox's `order`
                  property, which reorders how items are PAINTED without
                  moving them in the DOM — so the visual order reads
                  title-then-description here while the markup keeps
                  description first, which the wider tiers below depend on.
                  (Keeping DOM order fixed also matters for accessibility:
                  screen readers and Tab both follow the markup, not `order`.)
                  No magic pixel heights —
                  the box and the card both grow to fit whatever the text needs
                  (card heights 475/506/475px across the three studies, per
                  Figma 530:77557 — real variation from description length,
                  not a bug).
                - 600-900px: today's shipped part-2 behavior, unchanged —
                  `relative` box, fixed h-[73px], description `absolute` so it
                  never pushes the title, title pinned to the bottom via
                  `justify-end` then permanently shifted up 50px (no hover on
                  touch, so it's just always in the "revealed" position). The
                  8px gap above the description = title's 50px lift minus the
                  description's 42px height.
                - >=900px: same fixed-height mechanism, but hover-gated
                  (opacity 0->1, translate 0->-50px on `group-hover`) instead
                  of permanently revealed.
                NOTE: 50px is tied to the 2-line (42px) description used at
                600px+ — a longer/shorter description would change the needed
                offset (a real flex `gap-2` would be sturdier if copy varies,
                which is exactly why the <600px tier uses gap-2 instead). */}
            <div className="relative flex w-full flex-col items-start gap-2 min-[600px]:h-[73px] min-[600px]:justify-end">
                {/* DESCRIPTION — normal flow (ordered last) below 600px;
                    absolute + always-visible at 600-900px; hover-gated
                    (opacity 0->1) at >=900px.
                    `absolute` at 600px+ lifts it OUT OF NORMAL FLOW, so it
                    stops occupying space in the column and therefore can't
                    push the title down when it appears.
                    group-focus-visible mirrors the hover reveal for keyboard
                    users: :focus-visible is the variant that fires on
                    keyboard focus but not on a mouse click, so tabbing to the
                    card reveals exactly what hovering it does. */}
                <p className="order-last w-full font-sans text-[14px] text-textSecondarySurface opacity-100 transition duration-[520ms] ease-spring-gentle motion-reduce:transition-none min-[600px]:absolute min-[600px]:bottom-0 min-[600px]:left-0 min-[600px]:order-none min-[900px]:opacity-0 min-[900px]:group-hover:opacity-100 min-[900px]:group-focus-visible:opacity-100">
                    {description}
                </p>

                {/* TITLE — an h3, giving the home page a real heading outline
                    (h1 hero > h2 "Selected work" > h3 card titles) for screen
                    readers and search engines. It still looks exactly like the
                    <p> it replaced, because Tailwind's PREFLIGHT — the base
                    reset it injects before your own styles — strips headings
                    back to inherited size and weight, leaving the classes here
                    as the only thing that styles it. Normal flow
                    (ordered first) below 600px; shifted up 50px permanently at
                    600-900px (no hover on touch); hover-gated shift at >=900px
                    instead, with the gentle spring (watch the slight overshoot).
                    group-focus-visible = the same reveal for keyboard focus. */}
                <h3 className="order-first w-full font-serif text-[24px] text-textPrimary transition duration-[520ms] ease-spring-gentle motion-reduce:transition-none min-[600px]:order-none min-[600px]:-translate-y-[50px] min-[900px]:translate-y-0 min-[900px]:group-hover:-translate-y-[50px] min-[900px]:group-focus-visible:-translate-y-[50px]">
                    {title}
                </h3>
            </div>
        </Link>
    );
}
