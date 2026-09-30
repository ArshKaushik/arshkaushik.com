// The white, dashed-edged box that opens a page (Home hero, About). Callers
// pick which dashed edges to draw via className (e.g. "dash-t", "dash-y"), since
// Home's bottom edge comes from the stats row below it instead.
export default function SurfaceCard({
    className = "",
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className={`flex w-full flex-col items-start dashed bg-surface p-6 ${className}`}
        >
            {children}
        </div>
    );
}
