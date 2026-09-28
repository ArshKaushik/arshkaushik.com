import Link from "next/link";

export const navLinkClassName = // Used in BackNav.tsx as well
    "flex h-7 origin-left items-center whitespace-nowrap text-[12px] text-textSecondaryPage transition-[color,scale] duration-[520ms] ease-spring-gentle hover:scale-[1.1667] hover:text-textPrimary motion-reduce:transition-none min-[900px]:w-[180px]";

// Current-page state for Sidebar's Selected work / About switcher — no hover
// transition since there's nowhere left to scale/color to. whitespace-nowrap
// matters here specifically: "Selected work" is two words, and below 900px
// (where the min-[900px]:w-[180px] floor doesn't apply yet) justify-between
// gives it just enough room to wrap onto a second line without it.
export const navLinkActiveClassName =
    "flex h-7 items-center whitespace-nowrap text-[14px] text-textPrimary min-[900px]:w-[180px]";

export default function NavLink({
    href,
    target,
    active,
    children,
}: {
    href: string;
    target?: string;
    active?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            target={target}
            rel={target === "_blank" ? "noopener noreferrer" : undefined}
            aria-current={active ? "page" : undefined}
            className={active ? navLinkActiveClassName : navLinkClassName}
        >
            {children}
        </Link>
    );
}
