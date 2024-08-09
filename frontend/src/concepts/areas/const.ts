import { DashboardCommonConfig } from '~/k8sTypes';
import { StackCapability, StackComponent, SupportedArea, SupportedAreasState } from './types';

export const allFeatureFlags: string[] = Object.keys({
  enablement: false,
  disableInfo: false,
  disableSupport: false,
  disableClusterManager: false,
  disableTracking: false,
  disableBYONImageStream: false,
  disableISVBadges: false,
  disableAppLauncher: false,
  disableUserManagement: false,
  disableHome: false,
  disableProjects: false,
  disableModelServing: false,
  disableProjectSharing: false,
  disableCustomServingRuntimes: false,
  disablePipelines: false,
  disableBiasMetrics: false,
  disablePerformanceMetrics: false,
  disableKServe: false,
  disableKServeAuth: false,
  disableKServeMetrics: false,
  disableModelMesh: false,
  disableAcceleratorProfiles: false,
  disablePipelineExperiments: false,
  disableS3Endpoint: false,
  disableArtifactsAPI: false,
  disableDistributedWorkloads: false,
  disableModelRegistry: false,
  disableConnectionTypes: false,
} satisfies DashboardCommonConfig);

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
  [SupportedArea.CONNECTION_TYPES]: {
    featureFlags: ['disableConnectionTypes'],
  },
  [SupportedArea.DS_PIPELINES]: {
    featureFlags: ['disablePipelines'],
    requiredComponents: [StackComponent.DS_PIPELINES],
  },
  [SupportedArea.HOME]: {
    featureFlags: ['disableHome'],
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
  [SupportedArea.K_SERVE_AUTH]: {
    featureFlags: ['disableKServeAuth'],
    reliantAreas: [SupportedArea.K_SERVE],
    requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
  },
  [SupportedArea.K_SERVE_METRICS]: {
    featureFlags: ['disableKServeMetrics'],
    reliantAreas: [SupportedArea.K_SERVE, SupportedArea.MODEL_SERVING],
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
  [SupportedArea.BIAS_METRICS]: {
    featureFlags: ['disableBiasMetrics'],
    requiredComponents: [StackComponent.TRUSTY_AI],
    reliantAreas: [SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.PERFORMANCE_METRICS]: {
    featureFlags: ['disablePerformanceMetrics'],
    reliantAreas: [SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.TRUSTY_AI]: {
    requiredComponents: [StackComponent.TRUSTY_AI],
    reliantAreas: [SupportedArea.BIAS_METRICS],
  },
  [SupportedArea.PIPELINE_EXPERIMENTS]: {
    featureFlags: ['disablePipelineExperiments'],
    reliantAreas: [SupportedArea.DS_PIPELINES],
  },

  [SupportedArea.ARTIFACT_API]: {
    featureFlags: ['disableArtifactsAPI'],
    reliantAreas: [SupportedArea.DS_PIPELINES],
  },

  [SupportedArea.S3_ENDPOINT]: {
    featureFlags: ['disableS3Endpoint'],
    reliantAreas: [SupportedArea.DS_PIPELINES],
  },
  [SupportedArea.DISTRIBUTED_WORKLOADS]: {
    featureFlags: ['disableDistributedWorkloads'],
    requiredComponents: [StackComponent.KUEUE],
  },
  [SupportedArea.MODEL_REGISTRY]: {
    featureFlags: ['disableModelRegistry'],
    requiredComponents: [StackComponent.MODEL_REGISTRY],
    requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
  },
};
