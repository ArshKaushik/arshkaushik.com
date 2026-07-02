import { identity, navLinks } from "@/lib/content";
import NavLink from "@/components/ui/NavLink";

// Figma: "navigation" — the sticky 260px left rail.
// It's a full-height column with the name/role at the top and links pinned to
// the bottom (justify-between does the pinning).
export default function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col items-start justify-between bg-page px-10 pt-11 pb-10">
      {/* Figma: "head" */}
      <div className="flex flex-col items-start gap-2">
        <p className="text-[14px] text-textPrimary">{identity.name}</p>
        <p className="text-[12px] text-textSecondaryPage">{identity.role}</p>
      </div>

      {/* Figma: "bottomLinks" */}
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
