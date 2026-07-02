// Figma component: "caseStudyCard" — an image slot with a serif title beneath.
// On hover (Figma "State=Hovered") the title slides UP and a description fades
// in beneath it, using a "Gentle" spring easing (see --ease-spring-gentle in
// globals.css). `group` on the <article> is what lets the inner title/description
// react to the WHOLE card being hovered — any child can then use `group-hover:*`.
//
// `dashed` turns on our custom 10px/10px dashes (see globals.css); `dash-b`
// draws the bottom edge. The first card also gets `dash-t` via the `isFirst`
// prop so it has a top edge too (markers stack). We can't use CSS `:first-child`
// here: the section's first child is the "Selected work" title, not a card.
export default function CaseStudyCard({
    title,
    description,
    isFirst = false,
}: {
    title: string;
    description: string;
    isFirst?: boolean;
}) {
    return (
        <article
            className={`group flex h-[441px] w-full flex-col items-start gap-6 dashed dash-b bg-surface p-6 ${
                isFirst ? "dash-t" : ""
            }`}
        >
            {/* Figma: "thumbnail" — image slot. Drop a <Image /> here later. */}
            <div className="h-[296px] w-full bg-surface" />

            {/* Figma: "title&description".
                `relative` makes this box the positioning context for the
                description below (which is `absolute`). The title stays in normal
                flow, pinned to the bottom by `justify-end`; on hover it slides up
                to reveal the description. The 8px gap between them is produced by
                how far the title rises: the description sits pinned at the bottom
                (height 42px), and the title lifts by (42 + 8) = 50px, leaving
                exactly 8px below it. NOTE: 50px is tied to the current 2-line
                (42px) descriptions — a longer/shorter description would change the
                needed offset (a real flex `gap-2` would be sturdier if copy varies). */}
            <div className="relative flex h-[73px] w-full flex-col items-start justify-end">
                {/* DESCRIPTION — Figma node 72:72 animates opacity 0 → 1 (it fades
                    in place; it does NOT move).
                    • `absolute bottom-0 left-0 w-full` pins it to the bottom of the
                      box and takes it OUT of flow, so it never pushes the title.
                    • Listed BEFORE the title in the DOM so the title paints on top
                      of it while sliding away (cleaner overlap during the motion).
                    • `opacity-0` → `group-hover:opacity-100` is the fade itself.

                    HOW THE ANIMATION ACTUALLY RUNS (the core pattern to learn):
                    • `transition` = "animate my properties when they change."
                      Tailwind v4's `transition` covers opacity, transform, translate,
                      colors, etc. Without it, opacity would jump 0→1 instantly.
                    • `duration-[511ms]` = how long the change takes (the spring's
                      settle time, from Figma).
                    • `ease-spring-gentle` = the SHAPE of the change over that time
                      (our sampled spring curve). Change happens because a class is
                      added/removed on hover; the transition interpolates between the
                      two states, and on mouse-out it simply plays in reverse.
                    • `motion-reduce:transition-none` respects the OS "Reduce motion"
                      setting — it still appears/disappears, just without animating. */}
                <p className="absolute bottom-0 left-0 w-full font-sans text-[14px] text-textSecondarySurface opacity-0 transition duration-[511ms] ease-spring-gentle group-hover:opacity-100 motion-reduce:transition-none">
                    {description}
                </p>

                {/* TITLE — on hover it slides UP to open the 8px gap above the
                    description. Figma's title moves -42px, but that assumes Figma's
                    shorter description; ours renders 42px tall, so we lift the title
                    (42 + 8) = 50px to land an exact 8px gap.
                    `group-hover:-translate-y-[50px]` is the "hovered" position; the
                    same `transition duration-[511ms] ease-spring-gentle` animates
                    the move with the gentle spring — watch it nudge slightly past
                    and settle back, which is the spring's overshoot. */}
                <p className="w-full font-serif text-[24px] text-textPrimary transition duration-[511ms] ease-spring-gentle group-hover:-translate-y-[50px] motion-reduce:transition-none">
                    {title}
                </p>
            </div>
        </article>
    );
}
