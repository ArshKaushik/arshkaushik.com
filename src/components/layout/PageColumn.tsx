// The centered 600px content column shared by every page (Home, About): dashed
// side rails, the 40px top inset, and bottom padding that clears the mobile /
// tablet nav pills. id="content" is the skip link's target in layout.tsx.
export default function PageColumn({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main
            id="content"
            className="relative flex min-h-screen flex-col items-start gap-6 overflow-clip [overflow-clip-margin:2px] pt-10 pb-44 snap-center-x after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:dashed after:dash-x min-[600px]:pb-[140px] min-[900px]:pb-0"
        >
            {children}
        </main>
    );
}
