import { heroTagline, stats } from "@/lib/content";
import Stat from "@/components/ui/Stat";

export default function Hero() {
    return (
        <section className="flex w-full flex-col items-start">

            <div className="flex w-full flex-col items-start dashed dash-t bg-surface p-6">
                <h1 className="w-full font-serif text-[40px] leading-[normal] font-normal text-textPrimary min-[600px]:w-[548px]">
                    {heroTagline}
                </h1>
            </div>

            <div className="flex w-full flex-col items-start dashed dash-y min-[600px]:flex-row">
                {stats.map((stat, index) => (
                    <Stat
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                        className={
                            index === 0
                                ? "w-full min-[600px]:flex-1"
                                : `w-full dashed dash-t min-[600px]:dash-l min-[600px]:[--dash-t:none] ${stat.width ?? ""}`
                        }
                    />
                ))}
            </div>
        </section>
    );
}
