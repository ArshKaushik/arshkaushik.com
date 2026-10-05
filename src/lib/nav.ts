// Which pageNavLinks entry is the current page. Case-study routes (/work/*)
// belong to Selected work, so anything that isn't /about maps to "/".
// Shared by Sidebar (active link) and BottomNavPill (label + dropdown value)
// so the two can never disagree.
export function currentPageHref(pathname: string): string {
    return pathname.startsWith("/about") ? "/about" : "/";
}
