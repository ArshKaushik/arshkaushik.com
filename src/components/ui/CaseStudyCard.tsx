import Link from "next/link";

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
    thumbnail?: string;
    isFirst?: boolean;
}) {
    return (
        <Link
            href={`/work/${slug}`}
            // focus-visible:relative focus-visible:z-10 — keyboard focus ring fix.
            // The ring is the browser's default outline, and an outline paints
            // OUTSIDE the border box, in pixels that belong to whatever sits next
            // to the card. The cards are flush siblings (no gap on the section)
            // with an opaque bg-surface, and a later sibling paints over an earlier
            // one — so the next card was covering the bottom of this one's ring,
            // leaving a three-sided box. Only the last card, which has the
            // footer's gap-6 beneath it, showed all four sides.
            // Raising the focused card into its own stacking layer puts its
            // outline above the neighbours instead of under them. Scoped to
            // focus-visible so nothing changes at rest or on mouse click.
            className={`group flex h-auto w-full flex-col items-start gap-6 dashed dash-b bg-surface p-6 transition-opacity focus-visible:relative focus-visible:z-10 active:opacity-70 min-[600px]:h-[441px] ${
                isFirst ? "dash-t" : ""
            }`}
        >
            <div className="relative h-[296px] w-full overflow-hidden bg-surface">
                {thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element -- next/image is the resampler I removed; sharp is a devDependency so it isn't available at runtime anyway
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

            <div className="relative flex w-full flex-col items-start gap-2 min-[600px]:h-[73px] min-[600px]:justify-end">
                <p className="order-last w-full font-sans text-[14px] text-textSecondarySurface opacity-100 transition duration-[520ms] ease-spring-gentle motion-reduce:transition-none min-[600px]:absolute min-[600px]:bottom-0 min-[600px]:left-0 min-[600px]:order-none min-[900px]:opacity-0 min-[900px]:group-hover:opacity-100 min-[900px]:group-focus-visible:opacity-100">
                    {description}
                </p>

                <h3 className="order-first w-full font-serif text-[24px] text-textPrimary transition duration-[520ms] ease-spring-gentle motion-reduce:transition-none min-[600px]:order-none min-[600px]:-translate-y-[50px] min-[900px]:translate-y-0 min-[900px]:group-hover:-translate-y-[50px] min-[900px]:group-focus-visible:-translate-y-[50px]">
                    {title}
                </h3>
            </div>
        </Link>
    );
}
