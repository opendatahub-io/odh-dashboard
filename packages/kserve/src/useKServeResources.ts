import { useModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import type { ModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { extractHardwareProfileConfigFromInferenceService } from '@odh-dashboard/internal/concepts/hardwareProfiles/useServingHardwareProfileConfig';
import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { KServeDeployment } from './deployments';

export const useKServeResources = (
  kserveDeployment: KServeDeployment,
): ModelServingPodSpecOptionsState => {
  const resources = useModelServingPodSpecOptionsState(
    kserveDeployment.server,
    kserveDeployment.model,
    false,
  );

  return resources;
};

export const extractHardwareProfileConfig = (
  kserveDeployment: KServeDeployment,
): Parameters<typeof useHardwareProfileConfig> => {
  return extractHardwareProfileConfigFromInferenceService(kserveDeployment.model);
};

export const applyHardwareProfileToDeployment = (
  kserveDeployment: KServeDeployment,
  // TODO: use parameters to assemble hardware profile config
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parameters: ReturnType<typeof useHardwareProfileConfig>,
): KServeDeployment => {
  return kserveDeployment;
};
