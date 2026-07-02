import Link from "next/link";

// Figma component: "navLink" — one link in the sidebar.
// Reused for every entry in navLinks, so its styling lives in exactly one place.
export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex h-7 w-[180px] items-center text-[12px] text-textSecondaryPage transition-colors hover:text-textPrimary"
    >
      {children}
    </Link>
  );
}
