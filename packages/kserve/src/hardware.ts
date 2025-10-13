import { extractHardwareProfileConfigFromInferenceService } from '@odh-dashboard/internal/concepts/hardwareProfiles/useServingHardwareProfileConfig';
import type {
  HardwareProfileConfig,
  useHardwareProfileConfig,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import type { KServeDeployment } from './deployments';

export const extractHardwareProfileConfig = (
  kserveDeployment: KServeDeployment,
): Parameters<typeof useHardwareProfileConfig> => {
  return extractHardwareProfileConfigFromInferenceService(kserveDeployment.model);
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
      value: envVar.value || '',
    })),
  };
};

export const applyHardwareProfileToDeployment = (
  inferenceService: InferenceServiceKind,
  hardwareProfile: HardwareProfileConfig,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  const hardwareProfileName = hardwareProfile.selectedProfile?.metadata.name ?? '';
  const hardwareProfileNamespace = hardwareProfile.selectedProfile?.metadata.namespace ?? '';

  result.metadata.annotations = {
    ...result.metadata.annotations,
    'opendatahub.io/hardware-profile-name': hardwareProfileName,
    'opendatahub.io/hardware-profile-namespace': hardwareProfileNamespace,
  };

  result.spec.predictor.model = {
    ...result.spec.predictor.model,
    resources: {
      ...result.spec.predictor.model?.resources,
      ...hardwareProfile.resources,
    },
  };

  return result;
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
