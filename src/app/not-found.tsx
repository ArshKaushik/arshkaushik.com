import Link from "next/link";

// Branded 404 — /work/anything-unknown notFound()s here (and so does any
// other bad URL). The default Next 404 is unstyled and off-brand; this one
// reuses the site's dashed-surface treatment. It renders inside the root
// layout's children slot, so it centers in the content area next to the
// sidebar rather than replacing the whole shell.
export default function NotFound() {
    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 dashed dash-x dash-y bg-surface px-12 py-10 text-center">
                <h1 className="font-serif text-[40px] font-normal text-textPrimary">
                    404
                </h1>
                <p className="text-[14px] text-textSecondarySurface">
                    This page doesn&apos;t exist.
                </p>
                <Link
                    href="/"
                    className="text-[14px] text-textPrimary underline underline-offset-2 transition-colors hover:text-textSecondarySurface"
                >
                    Back home
                </Link>
            </div>
        </main>
    );
}
