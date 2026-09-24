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
        // scroll={false}: on a soft navigation Next.js scrolls the new
        // content into view. The case study opens as a `position: fixed`
        // overlay, which Next skips, so it scrolled the next element in
        // the page instead — its hidden route announcer at the very bottom —
        // dragging the home page behind the overlay to its end (and back up
        // on close). The overlay needs no scrolling, so turn it off here.
        <Link
            href={`/work/${slug}`}
            scroll={false}
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
