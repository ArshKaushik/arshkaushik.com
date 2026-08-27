import Link from "next/link";

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
