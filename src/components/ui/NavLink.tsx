import Link from "next/link";

export const navLinkClassName = // Used in BackNav.tsx as well
    "flex h-7 origin-left items-center text-[12px] text-textSecondaryPage transition-[color,scale] duration-[520ms] ease-spring-gentle hover:scale-[1.1667] hover:text-textPrimary motion-reduce:transition-none min-[900px]:w-[180px]";

export default function NavLink({
    href,
    target,
    children,
}: {
    href: string;
    target?: string;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            target={target}
            rel={target === "_blank" ? "noopener noreferrer" : undefined}
            className={navLinkClassName}
        >
            {children}
        </Link>
    );
}
