import { identity, navLinks } from "@/lib/content";
import NavLink from "@/components/ui/NavLink";

export default function Sidebar() {
    return (
        <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col items-start justify-between bg-page px-10 pt-11 pb-10">

            <div className="flex flex-col items-start gap-2">
                <p className="text-[14px] text-textPrimary">
                    {identity.name}
                </p>
                <p className="text-[12px] text-textSecondaryPage">
                    {identity.role}
                </p>
            </div>


            <nav className="flex w-full flex-col items-start gap-2">
                {navLinks.map((link) => (
                    <NavLink key={link.label} href={link.href}>
                        {link.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
