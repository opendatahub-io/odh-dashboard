import type { ModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import type { ContainerResources } from '@odh-dashboard/internal/types';
import type { KServeDeployment } from './deployments';

export const getKserveFramework = (deployment: KServeDeployment): string | null => {
  const frameworkName = deployment.model.spec.predictor.model?.modelFormat?.name || '';
  const frameworkVersion = deployment.model.spec.predictor.model?.modelFormat?.version;

  if (!frameworkName && !frameworkVersion) {
    return null;
  }

  return frameworkVersion ? `${frameworkName}-${frameworkVersion}` : frameworkName;
};

export const getKserveReplicas = (deployment: KServeDeployment): number | null =>
  deployment.model.spec.predictor.minReplicas ?? deployment.server?.spec.replicas ?? null;

export const getKserveResourceSize = (deployment: KServeDeployment): ContainerResources | null =>
  (deployment.model.spec.predictor.model?.resources ||
    deployment.server?.spec.containers[0].resources) ??
  null;

export const getKserveHardwareAccelerator = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deployment: KServeDeployment,
): ModelServingPodSpecOptionsState | null => null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getKserveTokens = (deployment: KServeDeployment): string[] | null => null;
