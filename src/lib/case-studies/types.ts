export type CaseStudyMeta = { label: string; value: string }; 

export type CaseStudyPoint = { // 'What I did' & 'Impact' points
    lead: string;
    body: string;
    asset?: string;
    assetAlt?: string;
};

export type CaseStudy = {
    slug: string; // URL id for the detail route, e.g. "design-system" → /work/design-system
    title: string;
    subtitle: string;
    thumbnail?: string;
    meta: CaseStudyMeta[];
    context: string; // Company context
    problem: string;
    realProblem: string;
    whatIDid: CaseStudyPoint[];
    impact: CaseStudyPoint[];
    hardestCall: string;
};
