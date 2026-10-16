import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';

export const SKILL_REGISTRY_BASENAME = '/ai-hub/skills/registry';

export const skillRegistryBaseRoute = (namespace?: string): string => {
  if (!namespace) {
    return SKILL_REGISTRY_BASENAME;
  }
  return `${SKILL_REGISTRY_BASENAME}?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
};
