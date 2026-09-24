import type { ClusterSettingsType } from '@odh-dashboard/plugin-core/host-api';
import { DEFAULT_CULLER_TIMEOUT, DEFAULT_PVC_SIZE } from '#~/pages/clusterSettings/const';

export const mockClusterSettings = ({
  userTrackingEnabled = false,
  cullerTimeout = DEFAULT_CULLER_TIMEOUT,
  pvcSize = DEFAULT_PVC_SIZE,
  modelServingPlatformEnabled = {
    kServe: true,
    LLMd: true,
  },
  isDistributedInferencingDefault = true,
  defaultDeploymentStrategy = 'rolling',
  globalMLflowNamespaces = [],
}: Partial<ClusterSettingsType>): ClusterSettingsType => ({
  userTrackingEnabled,
  cullerTimeout,
  pvcSize,
  modelServingPlatformEnabled,
  isDistributedInferencingDefault,
  defaultDeploymentStrategy,
  globalMLflowNamespaces,
});
