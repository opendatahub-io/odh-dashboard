import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { HardwareProfileFeatureVisibility } from '@odh-dashboard/internal/k8sTypes';
import type { LLMdDeployment } from '../types';

export const extractHardwareProfileConfig = (
  llmdDeployment: LLMdDeployment,
): Parameters<typeof useHardwareProfileConfig> => {
  const legacyName =
    llmdDeployment.model.metadata.annotations?.['opendatahub.io/legacy-hardware-profile-name'];
  const name =
    legacyName ||
    llmdDeployment.model.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
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

export const extractReplicas = (llmdDeployment: LLMdDeployment): number | null => {
  return llmdDeployment.model.spec.replicas ?? null;
};
