/** Replicates model-registry's route pattern to avoid a compile-time dependency. */
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
