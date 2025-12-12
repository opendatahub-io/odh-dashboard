import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { CrPathConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import {
  getExistingHardwareProfileData,
  getExistingResources,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';
import { MODEL_SERVING_VISIBILITY } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';

export const LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS: CrPathConfig = {
  containerResourcesPath: 'spec.template.containers.0.resources',
  tolerationsPath: 'spec.template.tolerations',
  nodeSelectorPath: 'spec.template.nodeSelector',
};

export const extractHardwareProfileConfig = (
  llmdDeployment: LLMdDeployment,
): Parameters<typeof useHardwareProfileConfig> => {
  const { name, namespace: hardwareProfileNamespace } = getExistingHardwareProfileData(
    llmdDeployment.model,
  );
  const { existingContainerResources, existingTolerations, existingNodeSelector } =
    getExistingResources(llmdDeployment.model, LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS);
  return [
    name,
    existingContainerResources,
    existingTolerations,
    existingNodeSelector,
    MODEL_SERVING_VISIBILITY,
    llmdDeployment.model.metadata.namespace,
    hardwareProfileNamespace,
  ];
};

export const applyReplicas = (
  llmdInferenceService: LLMInferenceServiceKind,
  replicas: number,
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  result.spec.replicas = replicas;
  return result;
};

export const extractReplicas = (llmdDeployment: LLMdDeployment): number | null => {
  return llmdDeployment.model.spec.replicas ?? null;
};

export const extractRuntimeArgs = (
  deployment: LLMdDeployment,
): { enabled: boolean; args: string[] } => {
  const args = deployment.model.spec.template?.containers?.[0]?.args || [];
  return {
    enabled: args.length > 0,
    args,
  };
};

export const extractEnvironmentVariables = (
  deployment: LLMdDeployment,
): { enabled: boolean; variables: { name: string; value: string }[] } => {
  const envVars = deployment.model.spec.template?.containers?.[0]?.env || [];
  return {
    enabled: envVars.length > 0,
    variables: envVars.map((envVar) => ({
      name: envVar.name,
      value: envVar.value?.toString() || '',
    })),
  };
};
