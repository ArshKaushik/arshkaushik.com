import Link from "next/link";

// Figma component: "caseStudyCard" — an image slot with a serif title beneath.
// The whole card is a Link to /work/[slug]; clicking it opens that study's
// detail overlay (see src/app/@modal). `group` on the Link lets the inner
// title/description react to the WHOLE card being hovered via `group-hover:*`.
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
    thumbnailSvg,
    isFirst = false,
}: {
    slug: string;
    title: string;
    description: string;
    // Pre-rendered inline <svg> markup (see inline-svg.ts). Computed by the
    // caller (a Server Component) rather than here, since this component is
    // also reachable from client-rendered trees and can't touch Node's `fs`.
    thumbnailSvg?: string | false;
    isFirst?: boolean;
}) {
    return (
        <Link
            href={`/work/${slug}`}
            className={`group flex h-auto w-full flex-col items-start gap-6 dashed dash-b bg-surface p-6 transition-opacity active:opacity-70 min-[600px]:h-[441px] ${
                isFirst ? "dash-t" : ""
            }`}
        >
            {/* Figma: "thumbnail" — image slot. Shows the study's thumbnailCover
                SVG, cropped to fill; an empty box until set. Rendered as
                inline <svg> — the ONLY approach that measured pixel-crisp in
                every engine/DPR cell (learn/svg-thumbnail-blur.md §3), and it
                stays crisp under browser zoom and scaled macOS displays where
                any raster goes soft. Two raster generations were tried and
                rejected on visual quality (§1-§8: <img src=svg> WebKit blur;
                §9: WebP softness) — Arsh's call: the page-weight cost of
                inlining is accepted for now, quality wins (§10).
                preserveAspectRatio="xMinYMid slice" = SVG's own equivalent of
                object-cover + object-left: per Figma, the image should stay
                anchored to the LEFT edge as the card narrows across
                breakpoints, so the same content is always visible there and
                only the right side gets progressively cropped — not a
                symmetric center-crop that would shift what's visible on both
                edges as the container resizes. */}
            <div className="relative h-[296px] w-full overflow-hidden bg-surface">
                {thumbnailSvg && (
                    <div
                        role="img"
                        aria-label={`${title} preview`}
                        className="absolute inset-0"
                        dangerouslySetInnerHTML={{ __html: thumbnailSvg }}
                    />
                )}
            </div>

            {/* Figma: "title&description". Three tiers now (600px, not the
                Figma design's nominal 480px handoff — see snap-center-x's
                comment in globals.css for why 600 is the real, arithmetic-
                forced floor for every "restore part 2" breakpoint):
                - below 600px: normal auto-height flow. Title then description
                  just stack (order-first/order-last fixes the VISUAL order to
                  match reading order without touching DOM order, which the
                  wider tiers below still depend on). No magic pixel heights —
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
                    (opacity 0->1) at >=900px. `absolute` at 600px+ so it
                    never pushes the title. group-focus-visible mirrors the
                    hover reveal for keyboard users — tabbing to the card
                    shows the same content a mouse hover does. */}
                <p className="order-last w-full font-sans text-[14px] text-textSecondarySurface opacity-100 transition duration-[520ms] ease-spring-gentle motion-reduce:transition-none min-[600px]:absolute min-[600px]:bottom-0 min-[600px]:left-0 min-[600px]:order-none min-[900px]:opacity-0 min-[900px]:group-hover:opacity-100 min-[900px]:group-focus-visible:opacity-100">
                    {description}
                </p>

                {/* TITLE — an h3 (home outline: h1 hero > h2 "Selected work" >
                    h3 card titles) styled identically to the old <p> — Tailwind's
                    preflight resets heading size/weight to inherit, so the
                    classes are the only thing that styles it. Normal flow
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
