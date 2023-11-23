import { StackComponent, SupportedArea, SupportedAreasState } from './types';

export const SupportedAreasStateMap: SupportedAreasState = {
  [SupportedArea.BYON]: {
    featureFlags: ['disableBYONImageStream'],
  },
  [SupportedArea.ACCELERATOR_PROFILES]: {
    featureFlags: ['disableAcceleratorProfiles'],
  },
  [SupportedArea.CLUSTER_SETTINGS]: {
    featureFlags: ['disableClusterManager'],
  },
  [SupportedArea.CUSTOM_RUNTIMES]: {
    featureFlags: ['disableCustomServingRuntimes'],
    reliantAreas: [SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.DS_PIPELINES]: {
    featureFlags: ['disablePipelines'],
    requiredComponents: [StackComponent.DS_PIPELINES],
  },
  [SupportedArea.DS_PROJECTS_VIEW]: {
    featureFlags: ['disableProjects'],
  },
  [SupportedArea.DS_PROJECTS_PERMISSIONS]: {
    featureFlags: ['disableProjectSharing'],
    reliantAreas: [SupportedArea.DS_PROJECTS_VIEW],
  },
  [SupportedArea.K_SERVE]: {
    featureFlags: ['disableKServe'],
    requiredComponents: [StackComponent.K_SERVE],
  },
  [SupportedArea.MODEL_MESH]: {
    featureFlags: ['disableModelMesh'],
    requiredComponents: [StackComponent.MODEL_MESH],
  },
  [SupportedArea.MODEL_SERVING]: {
    featureFlags: ['disableModelServing'],
  },
  [SupportedArea.USER_MANAGEMENT]: {
    featureFlags: ['disableUserManagement'],
  },
  [SupportedArea.WORKBENCHES]: {
    // featureFlags: [], // TODO: We want to disable, no flag exists today
    requiredComponents: [StackComponent.WORKBENCHES],
    reliantAreas: [SupportedArea.DS_PROJECTS_VIEW],
  },
  [SupportedArea.SERVICE_MESH]: {
    featureFlags: ['disableServiceMesh'],
  },
  [SupportedArea.BIAS_METRICS]: {
    featureFlags: ['disableBiasMetrics'],
    requiredComponents: [StackComponent.TRUSTY_AI],
    reliantAreas: [SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.PERFORMANCE_METRICS]: {
    featureFlags: ['disablePerformanceMetrics'],
    requiredComponents: [StackComponent.MODEL_MESH], // TODO: remove when KServe support is added
    reliantAreas: [SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.TRUSTY_AI]: {
    requiredComponents: [StackComponent.TRUSTY_AI],
    reliantAreas: [SupportedArea.BIAS_METRICS],
  },
};
