import { heroTagline, stats } from "@/lib/content";
import Stat from "@/components/ui/Stat";

export default function Hero() {
    return (
        <section className="flex w-full flex-col items-start">

            <div className="flex w-full flex-col items-start dashed dash-t bg-surface p-6">
                {/* h1, not p: the page's one top-level heading, so screen
                    readers navigating by headings and search engines get a
                    real document outline (this > h2 "Selected work" > h3 card
                    titles). Renders identically — Tailwind's preflight resets
                    heading size/weight to inherit, so the classes do all the
                    styling. */}
                <h1 className="w-full font-serif text-[40px] leading-[normal] font-normal text-textPrimary min-[600px]:w-[548px]">
                    {heroTagline}
                </h1>
            </div>

            {/* Figma: "stats" — first cell fills, the rest are fixed width with a left divider.
                No fill: this row sits on the grey page, unlike the white tagline box above.
                Below 600px (not the Figma design's nominal 480px handoff — see
                snap-center-x's comment in globals.css for why 600 is the real,
                arithmetic-forced floor) the three stats stack in a column instead
                (Figma 530:77557 shows them at y=0,91,182, each full width) — a real
                fix, not just fidelity: at a fluid ~370px row, the two fixed-width
                cells (192+168=360px) would squeeze the flex-1 first cell down to
                ~10px in row mode. Each divider flips from a left border (row mode)
                to a top border (column mode) via the --dash-t/-l custom properties
                directly, same arbitrary-property technique used in Sidebar.tsx
                (min-[900px]:[background-image:none]). */}
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
