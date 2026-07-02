import { heroTagline, stats } from "@/lib/content";
import Stat from "@/components/ui/Stat";

export default function Hero() {
    return (
        <section className="flex w-full flex-col items-start">

            <div className="flex w-full flex-col items-start dashed dash-t bg-surface p-6">
                <p className="w-[548px] font-serif text-[40px] leading-[normal] text-textPrimary">
                    {heroTagline}
                </p>
            </div>

            {/* Figma: "stats" — first cell fills, the rest are fixed width with a left divider.
                No fill: this row sits on the grey page, unlike the white tagline box above. */}
            <div className="flex w-full items-start dashed dash-y">
                {stats.map((stat, index) => (
                    <Stat
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                        className={
                            index === 0
                                ? "flex-1"
                                : `${stat.width ?? ""} dashed dash-l`
                        }
                    />
                ))}
            </div>
        </section>
    );
}
