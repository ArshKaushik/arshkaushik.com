import type { CaseStudy } from "./types";
import { companyContext } from "./shared";

// Source: ~/Downloads/case-study-2-connector-config.md
export const connectorConfig: CaseStudy = {
    slug: "connector-config",
    title: "Connector configuration without hand-holding",
    deck: "The first user research ever run on the connector-configuration flow — distilled into three features that let users set up a data source on their own.",
    summary:
        "Research-led redesign of a five-step data-configuration flow — replacing jargon and dead ends with a path data stewards could follow alone. Support tickets fell 50%.",
    meta: [
        {
            label: "Role",
            value: "Led — sole designer on the project (senior design mentorship & reviews)",
        },
        {
            label: "Team",
            value: "Data Configuration team; partnered with PM, product owner, engineering, and the Data Quality team",
        },
        {
            label: "Timeline",
            value: "~5.5 months — ~1.5 research · ~2.5 design · ~1.5 development",
        },
        {
            label: "Method & tools",
            value: "First-ever user research (6 interviews) · Figma · FigJam · MS Teams · Copilot (analysis)",
        },
    ],
    context: companyContext,
    problem:
        "Setting up a data source meant moving through a multi-step flow — source, credentials, catalog, profiling, scheduling — built on non-standard terminology the UI never explained. Scheduling, with its two schedulers, was the worst. Anyone who hadn't used it for years got stuck, and the confusion turned into support tickets.",
    realProblem:
        "The flow had never been researched — every decision rested on the team's own product assumptions, never tested against a user. The friction wasn't one bad screen; nothing on screen told users what it was asking of them, or why. It also boxed them in: routine control over their own data assets — catalog rules, which datasets to profile and score, scheduling specifics, a closing summary — lived in a *separate* product, so finishing a connector meant detouring out to the Data Catalog to do it.",
    whatIDid: [
        {
            lead: "Ran the flow's first-ever user research.",
            body: "Scoped it, wrote the guide, recruited, and interviewed six support engineers chosen *because* they didn't know the flow — so the gaps would surface without veteran bias.",
        },
        {
            lead: "Synthesized and aligned.",
            body: "Analyzed in FigJam (and tested Copilot as an analysis aid), then walked design, PM/product owner, and engineering through the findings to agree on what to build.",
        },
        {
            lead: "Designed three features as one flow.",
            body: "Translated the findings into three feature tickets and designed them in parallel as a single coherent experience, not three patches.",
        },
        {
            lead: "Brought control in-house.",
            body: "Gave users command over their own data assets inside the flow — catalog rules, dataset selection for profiling and scoring, scheduling options, and an end-of-flow summary — instead of forcing a detour to a separate product to get them.",
        },
        {
            lead: "Held the scope line.",
            body: "Kept it a connector-configuration flow — not a launchpad into other suite products — while reconciling overlapping, already-shipped work from the Data Quality team.",
        },
        {
            lead: "Made the case for UX analytics.",
            body: "Used the research to convince product and engineering to stand up proper UX measurement — heatmaps, funnels, event tracking — so future problems could surface in data before they needed a full research cycle.",
        },
    ],
    impact: [
        {
            lead: "~50% drop in support tickets",
            body: "about understanding the flow — validated with fresh-eyes internal testing before launch.",
        },
        {
            lead: "The flow became self-service",
            body: "users could configure a source, including catalog, profiling, and scheduling controls that used to require a separate product, without hand-holding.",
        },
        {
            lead: "Set the first research baseline",
            body: "for a flow only ever designed on assumption — and got UX analytics onto the roadmap, so future problems surface in data first.",
        },
    ],
    hardestCall:
        "Late in the redesign, we found the Data Quality team had already shipped two overlapping features, with a third coming — surfaced only because cross-team communication, especially at the PM level, hadn't been happening. Absorbing them ballooned the scope. The hard judgment was refusing to let the flow sprawl: I pushed to keep it a clean connector-configuration experience rather than a maze of routes into the rest of the suite, even as the pressure to bolt everything on mounted.",
};
