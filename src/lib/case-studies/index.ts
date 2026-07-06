import { designSystem } from "./design-system";
import { connectorConfig } from "./connector-config";
import { commandLine } from "./command-line";

export type { CaseStudy, CaseStudyMeta, CaseStudyPoint } from "./types";

// The order here is the display order (home "Selected work" cards, and any
// future listing). Add a new case study by creating its file and appending it.
export const caseStudies = [designSystem, connectorConfig, commandLine];
