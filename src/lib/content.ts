export const identity = {
    name: "Arsh Kaushik",
    role: "Product Designer",
};

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
        label: "Ships in",
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
