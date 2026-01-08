import { DEFAULT_CULLER_TIMEOUT, DEFAULT_PVC_SIZE } from '#~/pages/clusterSettings/const';
import { ClusterSettingsType } from '#~/types';

export const mockClusterSettings = ({
  userTrackingEnabled = false,
  cullerTimeout = DEFAULT_CULLER_TIMEOUT,
  pvcSize = DEFAULT_PVC_SIZE,
  modelServingPlatformEnabled = {
    kServe: true,
    LLMd: true,
  },
  useDistributedInferencingByDefault = true,
  defaultDeploymentStrategy = 'rolling',
}: Partial<ClusterSettingsType>): ClusterSettingsType => ({
  userTrackingEnabled,
  cullerTimeout,
  pvcSize,
  modelServingPlatformEnabled,
  useDistributedInferencingByDefault,
  defaultDeploymentStrategy,
});
