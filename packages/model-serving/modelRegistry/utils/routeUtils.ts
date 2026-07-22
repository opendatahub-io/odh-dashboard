/**
 * Constructs the model-version deployments URL for model-registry navigation.
 *
 * Replicates the route pattern owned by model-registry so that model-serving
 * can build return-navigation URLs without a compile-time package dependency.
 */
export const modelVersionDeploymentsUrl = (
  mvId: string,
  rmId?: string,
  preferredModelRegistry?: string,
): string => {
  const base = `/ai-hub/models/registry${
    preferredModelRegistry ? `/${preferredModelRegistry}` : ''
  }`;
  return `${base}/registered-models/${rmId ?? ''}/versions/${mvId}/deployments`;
};
