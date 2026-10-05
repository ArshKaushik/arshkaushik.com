import { heroTagline, stats } from "@/lib/content";
import Stat from "@/components/ui/Stat";
import SurfaceCard from "@/components/ui/SurfaceCard";
import DisplayHeading from "@/components/ui/DisplayHeading";

export default function Hero() {
    return (
        <section className="flex w-full flex-col items-start">

            <SurfaceCard className="dash-t">
                <DisplayHeading>{heroTagline}</DisplayHeading>
            </SurfaceCard>

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
