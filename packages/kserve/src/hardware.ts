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
import type { ExtractionResult } from '@odh-dashboard/model-serving/extension-points';
import type { KServeDeployment } from './deployments';

export { INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS };

export const extractHardwareProfileConfig = (
  kserveDeployment: KServeDeployment,
): ExtractionResult<Parameters<typeof useHardwareProfileConfig>> => {
  const { name, namespace: hardwareProfileNamespace } = getExistingHardwareProfileData(
    kserveDeployment.model,
  );
  const { existingContainerResources, existingTolerations, existingNodeSelector } =
    getExistingResources(kserveDeployment.model, INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS);

  const errors: string[] = [];

  const { tolerations, nodeSelector } = kserveDeployment.model.spec.predictor;
  if (tolerations && tolerations.length > 0) {
    errors.push(
      `Tolerations are configured (${tolerations.length} toleration(s)) but are not supported in the wizard form.`,
    );
  }
  if (nodeSelector && Object.keys(nodeSelector).length > 0) {
    errors.push('Node selectors are configured but are not supported in the wizard form.');
  }

  return {
    data: [
      name,
      existingContainerResources,
      existingTolerations,
      existingNodeSelector,
      MODEL_SERVING_VISIBILITY,
      kserveDeployment.model.metadata.namespace,
      hardwareProfileNamespace,
    ],
    error: errors.length > 0 ? errors.join(' ') : undefined,
  };
};

export const extractReplicas = (
  kserveDeployment: KServeDeployment,
): ExtractionResult<number | null> => {
  const { minReplicas, maxReplicas } = kserveDeployment.model.spec.predictor;

  if (
    typeof minReplicas === 'number' &&
    typeof maxReplicas === 'number' &&
    minReplicas !== maxReplicas
  ) {
    return {
      data: minReplicas,
      error: `Autoscaling is configured (minReplicas: ${minReplicas}, maxReplicas: ${maxReplicas}) but is not supported in the wizard form.`,
    };
  }

  return { data: minReplicas ?? maxReplicas ?? null };
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
