import type { ProjectKind } from '@odh-dashboard/k8s-core';

/**
 * Set on a project when namespace discovery could not read the namespace
 * object, so whether it is an AI project is unknown (not false).
 */
export type AiClassificationUnknown = { aiClassificationUnknown?: boolean };

/** Whether a project's AI classification is unknown; the selector keeps it in the AI filter. */
export const isAiClassificationUnknown = (project: ProjectKind): boolean =>
  'aiClassificationUnknown' in project && project.aiClassificationUnknown === true;
