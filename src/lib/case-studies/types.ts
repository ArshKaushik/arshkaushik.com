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
export type CaseStudyPoint = { lead: string; body: string };

export type CaseStudy = {
    /** URL id for the future detail route, e.g. "design-system" → /work/design-system */
    slug: string;
    /** H1 — the case study name */
    title: string;
    /** One-sentence subtitle shown under the title on the detail page */
    deck: string;
    /** Short teaser for the home "Selected work" card */
    summary: string;
    /** One SVG illustration used for BOTH the home card thumbnail and the
     *  detail-view visual. Path under /public, e.g.
     *  "/thumbnails/designSystem.svg" — read server-side by getInlineSvg()
     *  and embedded as inline <svg> markup (the only pixel-crisp pipeline;
     *  see learn/svg-thumbnail-blur.md). Optional; each slot falls back to
     *  an empty box when unset. Cropping is per-slot via
     *  preserveAspectRatio, chosen by the caller. */
    thumbnailCover?: string;
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
