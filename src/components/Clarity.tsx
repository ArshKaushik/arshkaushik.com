"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

export default function ClarityAnalytics({ projectId }: { projectId?: string }) {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        if (!projectId) return;
        Clarity.init(projectId);
    }, [projectId]);

    return null;
}
