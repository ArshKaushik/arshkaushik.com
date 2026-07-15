import type { CaseStudy } from "./types";
import { companyContext } from "./shared";

// Source: ~/Downloads/case-study-1-design-system.md
export const designSystem: CaseStudy = {
    slug: "design-system",
    title: "The design system that skipped Figma",
    deck: "A code-first design system, built and shipped with agentic AI — no Figma-to-code handoff, governed by a custom MCP that keeps every team on-spec.",
    summary:
        "A code-first design system built with agentic AI — no handoffs, governed by a custom MCP that keeps every team in sync. Design-to-ship time dropped 30%.",
    thumbnailCover: "/thumbnails/designSystem.webp",
    meta: [
        {
            label: "Role",
            value: "Co-led — 1 of 6 designers with prior design-system context, on a ~30-person design org",
        },
        { label: "Team", value: "5 designers + 1 embedded UI engineer" },
        {
            label: "Timeline",
            value: "~1 month to a mature system · ~2.5 months to migrate the full suite",
        },
        {
            label: "Stack",
            value: "Next.js · shadcn/ui · Tailwind · Storybook · custom MCP · Lucide",
        },
    ],
    context: companyContext,
    problem:
        "Our design system was well-built in Figma but stalled in code. With too few front-end engineers to maintain it, components drifted between design and build — and every UX validation pass turned into rework.",
    realProblem:
        "The bottleneck wasn't Figma. It was the handoff itself. Across ~30 designers on an enterprise suite, everyone improvised their own patterns, a central team couldn't keep pace, and design-system debt took roughly six months to clear each cycle.",
    whatIDid: [
        {
            lead: "Went code-first.",
            body: "Stress-tested agentic AI on production-grade output, then rebuilt the system directly in code on a new stack — leaving the Figma-to-code handoff behind.",
        },
        {
            lead: "Built a custom MCP.",
            body: "Gave the AI agent live access to the design system, so any feature is auto-checked for compliance — instead of designers manually pointing AI at a cloned repo every build.",
        },
        {
            lead: "Made it a two-way loop.",
            body: "When the agent flags a gap, it either re-references the rule or surfaces a missing one to contribute back — so the whole org evolves the system, not one central team.",
        },
        {
            lead: "Set the governance.",
            body: "Defined how designers update components and how engineers consume them, with Storybook as the component source of truth and a documentation layer for everyone else.",
        },
    ],
    impact: [
        {
            lead: "~30% faster design-to-ship",
            body: "measured against the prior end-to-end feature average (~1.5–2 months, validation loop included).",
        },
        {
            lead: "Design-system debt: ~6 months to clear → ~1 week",
            body: "and often none.",
        },
        {
            lead: "Adopted org-wide",
            body: "with the entire suite migrated off Angular in ~2.5 months.",
        },
        {
            lead: "The design↔dev validation back-and-forth disappeared",
            body: "one role now owns both sides.",
        },
    ],
    hardestCall:
        "Agentic speed was easy; agentic *quality* wasn't. The real risk was AI pushing unstructured code straight to production. As the org formalized the experience-engineer role, I leaned on pairing designers with the embedded UI engineer to build genuine front-end fluency, and held the system to review gates — so we moved fast without shipping code we couldn't stand behind.",
};
