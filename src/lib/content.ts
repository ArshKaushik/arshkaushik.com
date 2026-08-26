export const identity = {
    name: "Arsh Kaushik",
    role: "Product Designer",
};

export const siteUrl = "https://arshkaushik.com";

export const location = {
    city: "New York",
    region: "NY",
    country: "US",
};

export const professionalSince = 2021;

export const yearsOfExperience = (() => {
    const now = new Date();
    return (
        now.getUTCFullYear() - professionalSince - (now.getUTCMonth() < 5 ? 1 : 0)
    );
})();

export const experienceSummary = `${yearsOfExperience}+ years of experience`;

export const education: {
    degree: string;
    field: string;
    institution: string;
    location: { city?: string; region?: string; country: string };
}[] = [ // Reverse chronological order
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

export const stats: { label: string; value: string; width?: string }[] = [
    { label: "Best lift", value: "Support tickets -50%" },
    { label: "Builds with", value: "Figma + Next.js", width: "min-[600px]:w-[192px]" },
    { label: "Ownership", value: "End-to-end", width: "min-[600px]:w-[168px]" }
];

export const footerText = "© 2026";
