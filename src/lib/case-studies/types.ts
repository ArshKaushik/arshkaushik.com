// Shape of a single case study. Maps 1:1 to the source markdown anatomy:
// deck → metadata table → problem / real problem → what I did / impact bullets →
// the hardest call.
//
// String fields may contain LIGHT inline markdown — `**bold**` and `*italic*`
// (e.g. the "Precisely" context, an emphasized word) — preserved verbatim from
// the source copy. Whatever renders these in the UI should apply that emphasis
// (a tiny inline formatter), or strip it.

/** One row of the case study's metadata table. Labels vary per study
 *  (Role / Team|Teams / Timeline / Stack|Method & tools), so it's an ORDERED
 *  list of pairs rather than fixed keys. */
export type CaseStudyMeta = { label: string; value: string };

/** A "What I did" or "Impact" bullet: a bold lead-in (the action, or the
 *  headline metric) plus supporting detail. `body` may be "" when the whole
 *  bullet is a single statement. Render as e.g. `<strong>{lead}</strong> {body}`. */
export type CaseStudyPoint = {
    lead: string;
    body: string;
    /** Optional illustration, rendered full-bleed at the bottom of the point
     *  card. Path under /public, e.g.
     *  "/csAssets/designSystem/whatIDid-asset1.png".
     *
     *  Every csAsset is authored at 1086x900. The card's asset well locks that
     *  ratio, so the image only ever scales to the card's width — never
     *  re-cropped, never distorted, identical framing on desktop and mobile.
     *
     *  All-or-nothing per section: a section renders as the card grid only when
     *  EVERY point in it has an asset, otherwise the whole section falls back to
     *  the plain text list. That's what lets a case study whose assets haven't
     *  been made yet keep its current look instead of showing empty wells. */
    asset?: string;
    /** Alt text for `asset`. Omit for decorative illustrations — the point's own
     *  lead/body already carries the meaning, so an unset value renders alt="". */
    assetAlt?: string;
};

export type CaseStudy = {
    /** URL id for the future detail route, e.g. "design-system" → /work/design-system */
    slug: string;
    /** H1 — the case study name */
    title: string;
    /** One-sentence subtitle shown under the title on the detail page */
    deck: string;
    /** Short teaser for the home "Selected work" card */
    summary: string;
    /** One image used for BOTH the home card thumbnail and the detail-view
     *  visual. Path under /public, e.g. "/thumbnails/designSystem.webp" —
     *  rendered with a plain <img>, no server-side file read involved.
     *
     *  Exported from Figma at 2208x1184: exactly 4x the card surface
     *  (552x296) and 3x the detail surface (736x394), so one file serves both
     *  at an integer multiple. RGBA — the soft drop shadow is real
     *  transparency, and composites over each slot's own background
     *  (bg-surface on the card, bg-page on the detail hero).
     *
     *  This replaced an inline-<svg> pipeline. The vectors were sharper in
     *  principle, but inlining them put ~1.4MB of markup in the HTML — and
     *  Next duplicated it again in the RSC payload, making the home page
     *  2,833KB of which only 14KB was the actual page. Vercel bills ISR cache
     *  reads in 8KB units, so that cost 354 read units per request instead of
     *  ~2 and consumed 75% of the free tier on almost no traffic.
     *
     *  Optional; each slot falls back to an empty box when unset. Cropping is
     *  per-slot via object-position, chosen by the caller. */
    thumbnail?: string;
    /** Metadata table rows, in order */
    meta: CaseStudyMeta[];
    /** Shared company/context paragraph (see shared.ts) */
    context: string;
    /** "The problem" */
    problem: string;
    /** "The real problem" */
    realProblem: string;
    /** "What I did" */
    whatIDid: CaseStudyPoint[];
    /** "Impact" — bullets carry the headline metrics */
    impact: CaseStudyPoint[];
    /** "The hardest call" */
    hardestCall: string;
};
