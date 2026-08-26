import { caseStudies, type CaseStudy } from "@/lib/case-studies";
import {
    education,
    experienceSummary,
    heroTagline,
    identity,
    location,
    navLinks,
    siteUrl,
} from "@/lib/content";

// schema.org JSON-LD, assembled from the SAME content modules the pages render
// from — so it can't drift out of sync with what a human reads.
//
// Why this exists: an AI asked "find me a product designer who can also code" or
// "assess this candidate" has to work out who the site is about. Prose makes that
// a guess; structured data makes it a lookup. Full reasoning, including what this
// deliberately does NOT claim, in learn/machine-readable-portfolio.md.
//
// Nothing here is authored copy. Every string is either quoted from the content
// modules or derived from them — the one exception is Person.description, which
// joins two existing strings because schema.org has no "years of experience"
// property.

// Stable @id anchors.
//
// Three schema.org keywords carry this whole file: @context names the
// vocabulary being used (always schema.org here), @type states what a thing IS
// (Person, WebSite, CreativeWork), and @id gives that thing a globally unique
// URL so it can be POINTED AT from elsewhere instead of copied.
//
// @id is why these two constants exist. A case-study page carries two JSON-LD
// blocks — the site graph from the root layout, and the CreativeWork from the
// page itself — and both need to mention Arsh. Describing him twice would let
// a crawler reasonably conclude there are two different people. So he is
// described exactly once, at PERSON_ID, and everything else references that id
// (personRef, just below). The URLs use a #fragment because an @id has to be
// unique but doesn't have to resolve to a real page.
export const PERSON_ID = `${siteUrl}/#person`;
export const WEBSITE_ID = `${siteUrl}/#website`;

const personRef = { "@id": PERSON_ID } as const;
const websiteRef = { "@id": WEBSITE_ID } as const;

// types.ts documents that any content string MAY carry light inline markdown
// (`**bold**`, `*italic*`, `[text](url)` — companyContext has a real link).
// Structured data wants plain text, so everything is passed through here. Not
// optional hygiene: without it, a future *emphasised* word ships literal
// asterisks into the schema. CaseStudyDetail's renderInline can't be reused —
// it's module-local and returns React nodes, not a string.
const plain = (s: string): string =>
    s
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1");

// Matched by URL HOST, not by label. `navLinks` labels are display copy and free
// to be reworded; the day "LinkedIn" becomes "LinkedIn Profile", a label match
// would silently yield an empty sameAs with no error. Hosts don't move.
const IDENTITY_HOSTS = ["linkedin.com", "github.com"];

const profileUrls = navLinks
    .map((l) => l.href)
    .filter((href) => IDENTITY_HOSTS.some((host) => href.includes(host)));

// Prefix match, not a label match, for the same reason.
const email = navLinks
    .find((l) => l.href.startsWith("mailto:"))
    ?.href.replace(/^mailto:/, "");

// The tools/methods Arsh works with, DERIVED from each study's "Stack" or
// "Method & tools" meta row (the values are `·`-separated). Deriving it means a
// new case study updates the skills list for free, with no second list to
// maintain. The label differs per study, hence the two-way match.
//
// Failure mode worth knowing: if those labels are ever renamed, this returns an
// empty array and NOTHING errors. There's an explicit check for that in the
// verification section of the learn doc.
const skillRow = (study: CaseStudy) =>
    study.meta.find(
        (row) =>
            row.label.startsWith("Stack") ||
            row.label.toLowerCase().includes("tools"),
    );

const splitSkills = (value: string) =>
    value
        .split("·")
        .map((s) => plain(s).trim())
        .filter(Boolean);

const knowsAbout = [
    ...new Set(
        caseStudies.flatMap((study) => {
            const row = skillRow(study);
            return row ? splitSkills(row.value) : [];
        }),
    ),
];

// Institutions. No date properties anywhere — see the comment on `education` in
// content.ts; the omission is deliberate.
const alumniOf = education.map((e) => ({
    "@type": "CollegeOrUniversity",
    name: e.institution,
    address: {
        "@type": "PostalAddress",
        ...(e.location.city ? { addressLocality: e.location.city } : {}),
        ...(e.location.region ? { addressRegion: e.location.region } : {}),
        addressCountry: e.location.country,
    },
}));

// The degrees themselves. `alumniOf` above is the widely-consumed signal and
// carries only the institution; this is where the degree and field of study live
// — which is the part that actually matters here, since the CS/AI + IXD
// combination is what evidences "designs AND codes".
const hasCredential = education.map((e) => ({
    "@type": "EducationalOccupationalCredential",
    name: `${e.degree} in ${e.field}`,
    credentialCategory: e.degree.startsWith("Master")
        ? "Master's Degree"
        : "Bachelor's Degree",
    recognizedBy: { "@type": "CollegeOrUniversity", name: e.institution },
}));

function personSchema() {
    return {
        "@type": "Person",
        "@id": PERSON_ID,
        name: identity.name,
        jobTitle: identity.role,
        // The ONE composed string in this file. heroTagline has no terminal
        // punctuation, hence the explicit period.
        description: `${plain(heroTagline)}. ${experienceSummary}.`,
        url: siteUrl,
        ...(profileUrls.length ? { sameAs: profileUrls } : {}),
        ...(email ? { email } : {}),
        address: {
            "@type": "PostalAddress",
            addressLocality: location.city,
            addressRegion: location.region,
            addressCountry: location.country,
        },
        ...(knowsAbout.length ? { knowsAbout } : {}),
        alumniOf,
        hasCredential,
    };
}

function websiteSchema() {
    return {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: siteUrl,
        name: identity.name,
        author: personRef,
    };
}

/** Person + WebSite in one @graph. Rendered once, in the root layout, so the
 *  Person is defined exactly once per document. */
export function siteGraph() {
    return {
        "@context": "https://schema.org",
        "@graph": [personSchema(), websiteSchema()],
    };
}

/** One case study as a CreativeWork. Its `author` is an @id REFERENCE to the
 *  Person the layout already defined — never an inlined copy. */
export function caseStudySchema(study: CaseStudy) {
    const row = skillRow(study);
    return {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "@id": `${siteUrl}/work/${study.slug}#work`,
        name: plain(study.title),
        // The study's own subtitle — the same sentence the detail view shows
        // under the title. `description` is the field a search engine or an AI
        // quotes when it summarises this work, and each subtitle ends on its
        // headline metric, which is the strongest thing to be quoted on.
        description: plain(study.subtitle),
        url: `${siteUrl}/work/${study.slug}`,
        // The ...(cond ? { key: value } : {}) idiom, which appears several
        // times in this file: spreading an empty object contributes nothing, so
        // the property ends up either present with a real value or absent
        // entirely. thumbnail is optional on CaseStudy, and emitting
        // `image: undefined` would serialise as a malformed field, so omitting
        // it is the correct schema rather than a shortcut.
        //
        // Worth knowing the flip side: when one of these conditions is wrongly
        // false, the property silently vanishes and nothing errors. That's the
        // failure mode called out on skillRow above.
        ...(study.thumbnail ? { image: `${siteUrl}${study.thumbnail}` } : {}),
        ...(row ? { keywords: splitSkills(row.value) } : {}),
        author: personRef,
        isPartOf: websiteRef,
    };
}
