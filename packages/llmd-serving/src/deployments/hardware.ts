import type { CrPathConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';

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

export const LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS: CrPathConfig = {
  containerResourcesPath: 'spec.template.containers.0.resources',
  tolerationsPath: 'spec.template.tolerations',
  nodeSelectorPath: 'spec.template.nodeSelector',
};
