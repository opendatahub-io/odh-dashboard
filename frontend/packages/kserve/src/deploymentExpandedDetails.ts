import type { KServeDeployment } from './deployments';

export const useKserveFramework = (deployment: KServeDeployment): string | null => {
  const frameworkName = deployment.model.spec.predictor.model?.modelFormat?.name || '';
  const frameworkVersion = deployment.model.spec.predictor.model?.modelFormat?.version;

  if (!frameworkName && !frameworkVersion) {
    return null;
  }

  return frameworkVersion ? `${frameworkName}-${frameworkVersion}` : frameworkName;
};

export const useKserveReplicas = (deployment: KServeDeployment): number | null =>
  deployment.model.spec.predictor.minReplicas ?? deployment.server?.spec.replicas ?? null;
