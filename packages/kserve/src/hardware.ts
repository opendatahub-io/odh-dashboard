import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import type { CrPathConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import type { KServeDeployment } from './deployments';

export const extractReplicas = (kserveDeployment: KServeDeployment): number | null => {
  return (
    kserveDeployment.model.spec.predictor.minReplicas ??
    kserveDeployment.model.spec.predictor.maxReplicas ??
    null
  );
};

export const extractRuntimeArgs = (
  kserveDeployment: KServeDeployment,
): { enabled: boolean; args: string[] } => {
  const args = kserveDeployment.model.spec.predictor.model?.args || [];
  return {
    enabled: args.length > 0,
    args,
  };
};

export const extractEnvironmentVariables = (
  kserveDeployment: KServeDeployment,
): { enabled: boolean; variables: { name: string; value: string }[] } => {
  const envVars = kserveDeployment.model.spec.predictor.model?.env || [];
  return {
    enabled: envVars.length > 0,
    variables: envVars.map((envVar) => ({
      name: envVar.name,
      value: envVar.value ?? '',
    })),
  };
};

export const applyReplicas = (
  inferenceService: InferenceServiceKind,
  numReplicas: number,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.spec.predictor.minReplicas = numReplicas;
  result.spec.predictor.maxReplicas = numReplicas;
  return result;
};

export const INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS: CrPathConfig = {
  containerResourcesPath: 'spec.predictor.model.resources',
  tolerationsPath: 'spec.predictor.tolerations',
  nodeSelectorPath: 'spec.predictor.nodeSelector',
};

