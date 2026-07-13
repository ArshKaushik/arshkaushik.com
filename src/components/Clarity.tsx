"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

// Microsoft Clarity: session recordings + heatmaps, site-wide (rendered once
// in the root layout, so it observes every route — home, both case-study
// routes, and the modal overlay, since all three mount under the same root).
//
// Gated to production only: without this, every localhost/pnpm-dev session
// while building or testing would show up as a real recorded session,
// polluting the actual visitor data with our own dev traffic.
//
// No Clarity.identify() call: that API attaches a custom visitor id to
// recordings (e.g. a logged-in user id) — this site has no accounts/login,
// so there's no identity to attach. init() alone is the whole setup.
export default function ClarityAnalytics({ projectId }: { projectId?: string }) {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        if (!projectId) return;
        Clarity.init(projectId);
    }, [projectId]);

    return null;
}
