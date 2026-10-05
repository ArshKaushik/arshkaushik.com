// The page's 40px serif <h1> (Home hero tagline, About heading).
export default function DisplayHeading({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <h1 className="w-full font-serif text-[40px] leading-[normal] font-normal text-textPrimary min-[600px]:w-[548px]">
            {children}
        </h1>
    );
}
