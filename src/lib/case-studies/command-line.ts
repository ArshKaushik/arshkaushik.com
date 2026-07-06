import type { CaseStudy } from "./types";
import { companyContext } from "./shared";

// Source: ~/Downloads/case-study-3-command-line-to-control-room.md
export const commandLine: CaseStudy = {
    slug: "command-line",
    title: "Command line to control room",
    deck: "Two CLI-bound workflows — agent versioning and agent health — rebuilt as one visual control room.",
    summary:
        "Turned CLI-only agent management into one visual interface — upgrades, rollbacks, and health monitoring at a glance, with instant outage alerts. Human errors fell 80%.",
    meta: [
        {
            label: "Role",
            value: "Lead designer on both efforts — **UX designer** on version management, **experience engineer** on the agent health dashboard (designed *and* built it with agentic AI). Senior design partner for reviews.",
        },
        {
            label: "Teams",
            value: "Data Integration (version management) + Data Configuration (agent health dashboard)",
        },
        {
            label: "Timeline",
            value: "~2.5mo version-management design · ~1mo dashboard (designed + built together)",
        },
        {
            label: "Stack",
            value: "Figma · VS Code · Copilot · Claude Code · Next.js / shadcn / Tailwind",
        },
    ],
    context: companyContext,
    problem:
        "Data stewards managed data agents entirely from the command line — upgrading and rolling back versions by hand. Seeing what a change would affect meant a long chain of commands; knowing whether an agent was even online meant hunting through the CLI or digging into its history on screen. The commands were long and easy to fat-finger.",
    realProblem:
        'Two teams, one root cause: the CLI made routine, high-stakes work — version changes on live agents — both blind and error-prone. Back-end command logs showed people repeatedly mistyping the lengthy commands and burning time just to answer "what depends on this?" The fix wasn\'t a better command. It was making the system\'s state visible.',
    whatIDid: [
        {
            lead: "Combined two separate efforts",
            body: "version management (Data Integration) and an agent health dashboard (Data Configuration) — into one coherent control surface.",
        },
        {
            lead: "Designed the version-management experience in Figma",
            body: "upgrades, rollbacks, and a clear view of dependencies and downstream impact that the CLI kept hidden.",
        },
        {
            lead: "Designed *and* built the health dashboard as an experience engineer",
            body: "agentically, in code — so stewards get status, history, and instant outage alerts at a glance instead of querying for them.",
        },
        {
            lead: "Climbed into the back end with the engineers",
            body: "to learn how versioning actually works — affected files, dependencies, failure modes — so the UI reflected real system behavior, not a designer's guess.",
        },
        {
            lead: "Pushed for new interaction patterns",
            body: "over the familiar table layout, making the case to PM and engineering for why they served users better.",
        },
    ],
    impact: [
        {
            lead: "~80% fewer task errors in internal testing",
            body: "validated with support engineers and fresh-eyes back-end engineers. (Production rollout was paused by a company-wide stack migration.)",
        },
        {
            lead: "Dependency impact that took a chain of CLI commands to uncover became visible at a glance.",
            body: "",
        },
        {
            lead: "Customers, shown the work via support engineers, expected a large cut",
            body: "in the time spent managing and monitoring agents.",
        },
    ],
    hardestCall:
        "Two fronts. Convincing the PM and engineers to leave the familiar table-style interface for new interaction patterns took repeated discussion and a clear UX rationale. Harder still was the technical climb: to design version management honestly, I had to understand how it actually works under the hood — which files change, what dependencies break, how the process runs — sitting with engineers until the system model was mine, not theirs. That depth is exactly what let me build the dashboard rather than just mock it.",
};
