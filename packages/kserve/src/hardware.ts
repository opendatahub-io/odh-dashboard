import { extractHardwareProfileConfigFromInferenceService } from '@odh-dashboard/internal/concepts/hardwareProfiles/useServingHardwareProfileConfig';
import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
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

export const applyHardwareProfileToDeployment = (
  kserveDeployment: KServeDeployment,
  // TODO: use parameters to assemble hardware profile config for the deployment action
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parameters: ReturnType<typeof useHardwareProfileConfig>,
): KServeDeployment => {
  return kserveDeployment;
};
