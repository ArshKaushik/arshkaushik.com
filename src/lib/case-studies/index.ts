import { designSystem } from "./design-system";
import { connectorConfig } from "./connector-config";
import { commandLine } from "./command-line";

export type { CaseStudy, CaseStudyMeta, CaseStudyPoint } from "./types";

export const caseStudies = [designSystem, connectorConfig, commandLine]; // Case study display order
