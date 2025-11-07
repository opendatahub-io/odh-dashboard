import { ClusterSettingsType } from '#~/types';

export const DEFAULT_PVC_SIZE = 20;
export const MIN_PVC_SIZE = 1;
export const MAX_PVC_SIZE = 16384;
export const CULLER_TIMEOUT_UNLIMITED = 'culler-unlimited-time';
export const CULLER_TIMEOUT_LIMITED = 'culler-limited-time';
export const DEFAULT_HOUR = 4;
export const MAX_HOUR = 1000;
export const MIN_HOUR = 0;
export const MAX_MINUTE = 59;
export const MIN_MINUTE = 0;
export const MIN_CULLER_TIMEOUT = 600; // 10 minutes
export const DEFAULT_CULLER_TIMEOUT = 31536000; // 1 year as no culling
export const DEFAULT_CONFIG: ClusterSettingsType = {
  pvcSize: DEFAULT_PVC_SIZE,
  cullerTimeout: DEFAULT_CULLER_TIMEOUT,
  userTrackingEnabled: false,
  modelServingPlatformEnabled: {
    kServe: true,
    modelMesh: false,
  },
  useDistributedInferencing: false,
  defaultDeploymentStrategy: 'rolling',
};
