export const identity = {
    name: "Arsh Kaushik",
    role: "Product Designer",
};

// The canonical origin, in ONE place. Was previously hardcoded three times
// (layout.tsx's metadataBase, sitemap.ts, robots.ts); structured-data.ts and
// the llms.txt route would have made it five.
export const siteUrl = "https://arshkaushik.com";

// Where Arsh is based. Used by the Person structured data — nothing renders it.
export const location = {
    city: "New York",
    region: "NY",
    country: "US",
};

// Arsh has been in product design professionally since June 2021. The "N+ years"
// figure is DERIVED rather than hardcoded so it can't quietly go stale — a
// portfolio still claiming "3 years" four years later is worse than silence.
export const professionalSince = 2021;

// The anniversary is 1 JUNE, not 1 January — so through May the count is one
// lower than plain year subtraction gives. Month is 0-indexed, so June = 5.
//
// UTC getters, deliberately: this runs at BUILD time, and a local build (EDT)
// and a Vercel build (UTC) sit hours apart. With local getters, building on the
// evening of 31 May in New York would emit "4+" while the identical moment on
// Vercel emits "5+". UTC makes the output depend on the instant, not the machine.
//
// Caveat: these consumers are prerendered, so the value is frozen at the last
// deploy. It refreshes on the first build after 1 June, not on 1 June itself.
export const yearsOfExperience = (() => {
    const now = new Date();
    return (
        now.getUTCFullYear() - professionalSince - (now.getUTCMonth() < 5 ? 1 : 0)
    );
})();

// Two shapes because the two consumers need different ones: the Person schema's
// `description` wants the whole phrase, while llms.txt already prints an
// "Experience:" label and "Experience: 5+ years of experience" reads badly.
export const experienceSummary = `${yearsOfExperience}+ years of experience`;

// Reverse-chronological, and with NO DATES — a deliberate decision, not an
// omission to be fixed. Arsh's reasoning: recruiters tend to infer seniority
// from graduation years rather than from the work itself, so the education is
// stated as credentials and institutions only.
//
// Do not "helpfully" add years here, and do not let a schema property
// (validFor, validIn, datePublished, startDate…) reintroduce them by the back
// door — see learn/machine-readable-portfolio.md.
export const education: {
    degree: string;
    field: string;
    institution: string;
    location: { city?: string; region?: string; country: string };
}[] = [
    {
        degree: "Master of Science",
        field: "Information Experience Design",
        institution: "Pratt Institute",
        location: { city: "New York", region: "NY", country: "US" },
    },
    {
        degree: "Bachelor of Technology",
        field: "Computer Science (Data Science and Artificial Intelligence)",
        institution: "SRM University",
        location: { country: "IN" },
    },
];

export const navLinks: { label: string; href: string }[] = [
    { label: "Resume", href: "https://drive.google.com/file/d/1xNfit0vVxvwP9IuHDVszUhwiyMJdn8wb/view?usp=sharing" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/arshkaushik21/" },
    { label: "GitHub", href: "https://github.com/ArshKaushik" },
    { label: "Email", href: "mailto:arshkaushik21@gmail.com" },
];

export const heroTagline =
    "Solving the problem behind the stated problem through design & engineering";

// `width` is a full, literal responsive class fragment — NOT built by
// concatenating a variant prefix onto this string at runtime in Hero.tsx.
// Tailwind's scanner does static text extraction across the whole project,
// so a class assembled at runtime (e.g. `min-[600px]:${stat.width}`) never
// appears as one literal token anywhere in source and silently generates no
// CSS. The complete prefixed string just needs to exist verbatim somewhere.
export const stats: { label: string; value: string; width?: string }[] = [
    { label: "Best lift", value: "Support tickets -50%" },
    {
        // "Builds with", not the earlier "Ships in": that label parsed as a
        // duration ("ships in 2 weeks") before it parsed as a toolchain.
        label: "Builds with",
        value: "Figma + Next.js",
        width: "min-[600px]:w-[192px]",
    },
    {
        label: "Ownership",
        value: "End-to-end",
        width: "min-[600px]:w-[168px]",
    },
];

export const footerText = "© 2026";
