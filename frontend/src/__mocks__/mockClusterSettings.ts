import { DEFAULT_CULLER_TIMEOUT, DEFAULT_PVC_SIZE } from '#~/pages/clusterSettings/const';
import { ClusterSettingsType } from '#~/types';

export const mockClusterSettings = ({
  userTrackingEnabled = false,
  cullerTimeout = DEFAULT_CULLER_TIMEOUT,
  pvcSize = DEFAULT_PVC_SIZE,
  notebookTolerationSettings = {
    key: 'NotebooksOnlyChange',
    enabled: true,
  },
  modelServingPlatformEnabled = {
    kServe: true,
    modelMesh: true,
  },
}: Partial<ClusterSettingsType>): ClusterSettingsType => ({
  userTrackingEnabled,
  cullerTimeout,
  pvcSize,
  notebookTolerationSettings,
  modelServingPlatformEnabled,
});
