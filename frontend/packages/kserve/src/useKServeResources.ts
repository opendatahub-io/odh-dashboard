import { useModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import type { ModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
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
