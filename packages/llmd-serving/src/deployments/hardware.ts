import type {
  HardwareProfileConfig,
  useHardwareProfileConfig,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { HardwareProfileFeatureVisibility } from '@odh-dashboard/internal/k8sTypes';
import { structuredCloneWithMainContainer } from './model';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';

export const applyHardwareProfileConfig = (
  llmdInferenceService: LLMInferenceServiceKind,
  hardwareProfile: HardwareProfileConfig,
): LLMInferenceServiceKind => {
  const { result, mainContainer } = structuredCloneWithMainContainer(llmdInferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    'opendatahub.io/hardware-profile-name': hardwareProfile.selectedProfile?.metadata.name ?? '',
    'opendatahub.io/hardware-profile-namespace':
      hardwareProfile.selectedProfile?.metadata.namespace ?? '',
  };
  mainContainer.resources = hardwareProfile.resources ?? undefined;
  return result;
};

export const extractHardwareProfileConfig = (
  llmdDeployment: LLMdDeployment,
): Parameters<typeof useHardwareProfileConfig> => {
  const name = llmdDeployment.model.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const resources = llmdDeployment.model.spec.template?.containers?.[0]?.resources;
  const tolerations = undefined;
  const nodeSelector = undefined;
  const { namespace } = llmdDeployment.model.metadata;
  const hardwareProfileNamespace =
    llmdDeployment.model.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'];

  return [
    name,
    resources,
    tolerations,
    nodeSelector,
    [HardwareProfileFeatureVisibility.MODEL_SERVING],
    namespace,
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
