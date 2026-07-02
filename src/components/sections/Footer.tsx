import { footerText } from "@/lib/content";

export default function Footer() {
    return (
        <footer className="flex w-full items-start px-6 pt-6 pb-10">
            <p className="text-[14px] text-textSecondaryPage">{footerText}</p>
        </footer>
    );
}
