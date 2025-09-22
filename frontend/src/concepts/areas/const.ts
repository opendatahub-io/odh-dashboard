import { DashboardCommonConfig } from '#~/k8sTypes';
import {
  StackCapability,
  StackComponent,
  SupportedArea,
  SupportedAreasState,
  DataScienceStackComponent,
} from './types';

export const techPreviewFlags = {
  disableHardwareProfiles: true,
  disableModelRegistry: true,
} satisfies Partial<DashboardCommonConfig>;

export const devTemporaryFeatureFlags = {
  disableKueue: true,
  disableLlamaStackChatBot: true, // internal dev only
  disableProjectScoped: true,
  disableDeploymentWizard: true,
} satisfies Partial<DashboardCommonConfig>;

// Group 1: Core Dashboard Features
export const coreDashboardFlags = {
  enablement: false,
  disableInfo: false,
  disableSupport: false,
  disableHome: false,
  disableAppLauncher: false,
  disableTracking: false,
  disableISVBadges: false,
} satisfies Partial<DashboardCommonConfig>;

// Group 2: Project & User Management Features
export const projectManagementFlags = {
  disableProjects: false,
  disableProjectSharing: false,
  disableUserManagement: false,
  disableClusterManager: false,
  disableBYONImageStream: false,
  disableAdminConnectionTypes: false,
  disableStorageClasses: false,
  disableAcceleratorProfiles: false,
} satisfies Partial<DashboardCommonConfig>;

// Group 3: Model Serving & AI/ML Infrastructure
export const modelServingFlags = {
  disableModelServing: false,
  disableCustomServingRuntimes: false,
  disableServingRuntimeParams: false,
  disableKServe: false,
  disableKServeAuth: false,
  disableKServeMetrics: false,
  disableKServeRaw: false,
  disableModelMesh: false,
  disableNIMModelServing: false,
  disablePerformanceMetrics: false,
  disableTrustyBiasMetrics: false,
} satisfies Partial<DashboardCommonConfig>;

// Group 4: Advanced AI/ML Features & Pipelines
export const advancedAIMLFlags = {
  disablePipelines: false,
  disableDistributedWorkloads: false,
  disableModelCatalog: false,
  disableModelRegistrySecureDB: false,
  disableFeatureStore: false,
  disableFineTuning: true,
  disableLMEval: true,
  disableModelTraining: true,
} satisfies Partial<DashboardCommonConfig>;

// Combined feature flags object
const allFeatureFlagsConfig = {
  ...devTemporaryFeatureFlags,
  ...techPreviewFlags,
  ...coreDashboardFlags,
  ...projectManagementFlags,
  ...modelServingFlags,
  ...advancedAIMLFlags,
} satisfies DashboardCommonConfig;

export const definedFeatureFlags: string[] = Object.keys(allFeatureFlagsConfig);

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
  [SupportedArea.DEPLOYMENT_WIZARD]: {
    featureFlags: ['disableDeploymentWizard'],
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
  [SupportedArea.KUEUE]: {
    featureFlags: ['disableKueue'],
    requiredComponents: [StackComponent.KUEUE],
  },
  [SupportedArea.MODEL_CATALOG]: {
    featureFlags: ['disableModelCatalog'],
    reliantAreas: [SupportedArea.MODEL_REGISTRY],
  },
  [SupportedArea.MODEL_REGISTRY]: {
    featureFlags: ['disableModelRegistry'],
    requiredComponents: [StackComponent.MODEL_REGISTRY],
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
  [SupportedArea.FEATURE_STORE]: {
    featureFlags: ['disableFeatureStore'],
    requiredComponents: [StackComponent.FEAST_OPERATOR],
  },
  [SupportedArea.MODEL_TRAINING]: {
    featureFlags: ['disableModelTraining'],
    requiredComponents: [StackComponent.TRAINING_OPERATOR, StackComponent.KUEUE],
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
