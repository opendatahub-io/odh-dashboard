import { DashboardCommonConfig } from '~/k8sTypes';
import {
  StackCapability,
  StackComponent,
  SupportedArea,
  SupportedAreasState,
  DataScienceStackComponent,
} from './types';

export const definedFeatureFlags: string[] = Object.keys({
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
  disableProjectScoped: true,
  disableProjectSharing: false,
  disableCustomServingRuntimes: false,
  disablePipelines: false,
  disableTrustyBiasMetrics: false,
  disablePerformanceMetrics: false,
  disableKServe: false,
  disableKServeAuth: false,
  disableKServeMetrics: false,
  disableKServeRaw: false,
  disableModelMesh: false,
  disableAcceleratorProfiles: false,
  disableHardwareProfiles: false,
  disableDistributedWorkloads: false,
  disableModelCatalog: true,
  disableModelRegistry: false,
  disableModelRegistrySecureDB: false,
  disableServingRuntimeParams: false,
  disableStorageClasses: false,
  disableNIMModelServing: false,
  disableAdminConnectionTypes: false,
  disableFineTuning: true,
  disableLlamaStackChatBot: true, // internal dev only
  disableLMEval: true, // internal dev only
} satisfies DashboardCommonConfig);

export const SupportedAreasStateMap: SupportedAreasState = {
  [SupportedArea.BYON]: {
    featureFlags: ['disableBYONImageStream'],
  },
  [SupportedArea.ACCELERATOR_PROFILES]: {
    featureFlags: ['disableAcceleratorProfiles'],
  },
  [SupportedArea.HARDWARE_PROFILES]: {
    featureFlags: ['disableHardwareProfiles'],
  },
  [SupportedArea.CLUSTER_SETTINGS]: {
    featureFlags: ['disableClusterManager'],
  },
  [SupportedArea.CUSTOM_RUNTIMES]: {
    featureFlags: ['disableCustomServingRuntimes'],
    reliantAreas: [SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.STORAGE_CLASSES]: {
    featureFlags: ['disableStorageClasses'],
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
  [SupportedArea.DS_PROJECT_SCOPED]: {
    featureFlags: ['disableProjectScoped'],
    reliantAreas: [
      SupportedArea.WORKBENCHES,
      SupportedArea.HARDWARE_PROFILES,
      SupportedArea.MODEL_SERVING,
    ],
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
  [SupportedArea.K_SERVE_RAW]: {
    featureFlags: ['disableKServeRaw'],
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
    featureFlags: ['disableTrustyBiasMetrics'],
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
  [SupportedArea.DISTRIBUTED_WORKLOADS]: {
    featureFlags: ['disableDistributedWorkloads'],
    requiredComponents: [StackComponent.KUEUE],
  },
  [SupportedArea.MODEL_CATALOG]: {
    featureFlags: ['disableModelCatalog'],
    reliantAreas: [SupportedArea.MODEL_REGISTRY],
  },
  [SupportedArea.MODEL_REGISTRY]: {
    featureFlags: ['disableModelRegistry'],
    requiredComponents: [StackComponent.MODEL_REGISTRY],
    requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
  },
  [SupportedArea.SERVING_RUNTIME_PARAMS]: {
    featureFlags: ['disableServingRuntimeParams'],
    reliantAreas: [SupportedArea.K_SERVE, SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.MODEL_REGISTRY_SECURE_DB]: {
    featureFlags: ['disableModelRegistrySecureDB'],
    reliantAreas: [SupportedArea.MODEL_REGISTRY],
  },
  [SupportedArea.NIM_MODEL]: {
    featureFlags: ['disableNIMModelServing'],
    reliantAreas: [SupportedArea.K_SERVE],
  },
  [SupportedArea.ADMIN_CONNECTION_TYPES]: {
    featureFlags: ['disableAdminConnectionTypes'],
  },
  [SupportedArea.FINE_TUNING]: {
    featureFlags: ['disableFineTuning'],
    reliantAreas: [
      SupportedArea.DS_PIPELINES,
      SupportedArea.MODEL_CATALOG,
      SupportedArea.MODEL_REGISTRY,
    ],
  },
  [SupportedArea.LLAMA_STACK_CHAT_BOT]: {
    featureFlags: ['disableLlamaStackChatBot'],
    reliantAreas: [SupportedArea.MODEL_SERVING],
    //TODO: Add Llama Stack component when details known.
  },
  [SupportedArea.LM_EVAL]: {
    featureFlags: ['disableLMEval'],
    reliantAreas: [SupportedArea.MODEL_REGISTRY, SupportedArea.MODEL_SERVING],
  },
};

/** Maps each DataScienceStackComponent to its human-readable name **/
export const DataScienceStackComponentMap: Record<string, string> = {
  [DataScienceStackComponent.CODE_FLARE]: 'CodeFlare',
  [DataScienceStackComponent.DASHBOARD]: 'Dashboard',
  [DataScienceStackComponent.DS_PIPELINES]: 'Data science pipelines',
  [DataScienceStackComponent.KUEUE]: 'Kueue',
  [DataScienceStackComponent.MODEL_REGISTRY]: 'Model registry',
  [DataScienceStackComponent.FEAST_OPERATOR]: 'Feast operator',
  [DataScienceStackComponent.K_SERVE]: 'Model server and metrics',
  [DataScienceStackComponent.MODEL_MESH_SERVING]: 'Model server and metrics',
  [DataScienceStackComponent.RAY]: 'Ray',
  [DataScienceStackComponent.TRAINING_OPERATOR]: 'Training operator',
  [DataScienceStackComponent.TRUSTY_AI]: 'TrustyAI',
  [DataScienceStackComponent.WORKBENCHES]: 'Workbenches',
};
