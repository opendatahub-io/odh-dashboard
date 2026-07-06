import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import {
  getExistingHardwareProfileData,
  getExistingResources,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';
import {
  MODEL_SERVING_VISIBILITY,
  INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import type { KServeDeployment } from './deployments';

export { INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS };

export const extractHardwareProfileConfig = (
  kserveDeployment: KServeDeployment,
): Parameters<typeof useHardwareProfileConfig> => {
  const { name, namespace: hardwareProfileNamespace } = getExistingHardwareProfileData(
    kserveDeployment.model,
  );
  const { existingContainerResources, existingTolerations, existingNodeSelector } =
    getExistingResources(kserveDeployment.model, INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS);

  return [
    name,
    existingContainerResources,
    existingTolerations,
    existingNodeSelector,
    MODEL_SERVING_VISIBILITY,
    kserveDeployment.model.metadata.namespace,
    hardwareProfileNamespace,
  ];
};

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

export const extractAiAssetData = (
  kserveDeployment: KServeDeployment,
): { saveAsAiAsset: boolean; useCase: string } => {
  return {
    saveAsAiAsset:
      kserveDeployment.model.metadata.annotations?.['opendatahub.io/genai-asset'] === 'true',
    useCase: kserveDeployment.model.metadata.annotations?.['opendatahub.io/genai-use-case'] || '',
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
