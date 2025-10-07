import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { HardwareProfileFeatureVisibility } from '@odh-dashboard/internal/k8sTypes';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';

export const applyHardwareProfileConfig = (
  llmdInferenceService: LLMInferenceServiceKind,
  hardwareProfileName: string,
  hardwareProfileNamespace: string,
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    'opendatahub.io/hardware-profile-name': hardwareProfileName,
    'opendatahub.io/hardware-profile-namespace': hardwareProfileNamespace,
  };
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
