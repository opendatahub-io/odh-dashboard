import type { DashboardCommonConfig } from '@odh-dashboard/k8s-core';
import {
  SupportedArea,
  type SupportedAreasState,
  type CustomConditionFunction,
  DataScienceStackComponent,
} from '@odh-dashboard/plugin-core/areas';

// Shared operator readiness does not establish per-child backend reachability.
const isFeastOperatorReady: CustomConditionFunction = ({ dscStatus }) => {
  const conditions = dscStatus?.conditions;
  return (
    conditions?.some(
      (condition) => condition.type === 'FeastOperatorReady' && condition.status === 'True',
    ) ?? false
  );
};

export const techPreviewFlags = {
  genAiImageUpload: false,
  genAiAudioUpload: false,
  genAiTracing: false,
  guardrails: false,
  modelAsService: true,
  inferencePriorityField: false,
  aiAssetCustomEndpoints: false,
  mcpCatalog: false,
  mcpRegistry: false,
  skillRegistry: false,
  genAiMcpRegistryServers: false,
  toolCalling: false,
  modelCapabilities: false,
  deploymentWizardYAMLViewer: false,
  externalVectorStores: false,
  agentConfigManagement: false,
  genAiAgentDeployment: false,
  vLLMDeploymentOnMaaS: false,
  llmdTemplates: false,
  llmGatewayField: true,
  globalProjectPrompts: false,
  agentOps: false,
  dataRegistry: false,
  dataConnectHub: false,
  hardwareProfileDRA: false,
} satisfies Partial<DashboardCommonConfig>;

export const devTemporaryFeatureFlags = {
  // Temporary Grid migration switch: enables MaaS Gateway API paths for the MaaS and Gen AI
  // packages while grid-aware screens are migrated away from Kubernetes APIs.
  grid: false,
  disableKueue: true,
  disableProjectScoped: true,
  nimServiceOperator: false,
  agentOpsDeploy: false,
  agentsCatalog: false,
  workbenchesV2: false,
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
  projectRBAC: true,
  roleManagement: true,
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
  disableNIMModelServing: false,
  disablePerformanceMetrics: false,
  disableTrustyBiasMetrics: false,
  disableLLMd: false,
  nimWizard: true,
} satisfies Partial<DashboardCommonConfig>;

// Group 4: Advanced AI/ML Features & Pipelines
export const advancedAIMLFlags = {
  genAiStudio: true,
  promptManagement: true,
  automl: true,
  autorag: true,
  disablePipelines: false,
  disableDistributedWorkloads: false,
  disableModelCatalog: false,
  disableModelRegistry: false,
  disableModelRegistrySecureDB: false,
  disableFeatureStore: false,
  featureStoreAdmin: false,
  disableFineTuning: true,
  disableLMEval: true,
  trainingJobs: true,
  gpuaas: true,
  observabilityDashboard: true,
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

// Defaults for dev-only area flags that are unset in flagState. Unlisted dev flags default to off.
export const devFlagDefaults: Record<string, boolean> = {
  guidedTour: true,
};

export const SupportedAreasStateMap: SupportedAreasState = {
  [SupportedArea.BYON]: {
    featureFlags: ['disableBYONImageStream'],
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
    requiredComponents: [DataScienceStackComponent.DS_PIPELINES],
  },
  [SupportedArea.HOME]: {
    featureFlags: ['disableHome'],
  },
  [SupportedArea.DS_PROJECTS_VIEW]: {
    featureFlags: ['disableProjects'],
  },
  [SupportedArea.DS_PROJECT_SCOPED]: {
    featureFlags: ['disableProjectScoped'],
    reliantAreas: [SupportedArea.WORKBENCHES, SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.DS_PROJECTS_PERMISSIONS]: {
    featureFlags: ['disableProjectSharing'],
    reliantAreas: [SupportedArea.DS_PROJECTS_VIEW],
  },
  [SupportedArea.K_SERVE_AUTH]: {
    featureFlags: ['disableKServeAuth'],
    reliantAreas: [SupportedArea.K_SERVE],
  },
  [SupportedArea.K_SERVE_METRICS]: {
    featureFlags: ['disableKServeMetrics'],
    reliantAreas: [SupportedArea.K_SERVE, SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.K_SERVE_RAW]: {
    featureFlags: ['disableKServeRaw'],
    reliantAreas: [SupportedArea.K_SERVE, SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.LLMD_SERVING]: {
    featureFlags: ['disableLLMd'],
    reliantAreas: [SupportedArea.K_SERVE, SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.MODEL_SERVING]: {
    featureFlags: ['disableModelServing'],
  },
  [SupportedArea.USER_MANAGEMENT]: {
    featureFlags: ['disableUserManagement'],
  },
  [SupportedArea.WORKBENCHES]: {
    // featureFlags: [], // TODO: We want to disable, no flag exists today
    requiredComponents: [DataScienceStackComponent.WORKBENCHES],
    reliantAreas: [SupportedArea.DS_PROJECTS_VIEW],
  },
  [SupportedArea.BIAS_METRICS]: {
    featureFlags: ['disableTrustyBiasMetrics'],
    requiredComponents: [DataScienceStackComponent.TRUSTY_AI],
    reliantAreas: [SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.PERFORMANCE_METRICS]: {
    featureFlags: ['disablePerformanceMetrics'],
    reliantAreas: [SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.TRUSTY_AI]: {
    requiredComponents: [DataScienceStackComponent.TRUSTY_AI],
    reliantAreas: [SupportedArea.BIAS_METRICS],
  },
  [SupportedArea.DISTRIBUTED_WORKLOADS]: {
    featureFlags: ['disableDistributedWorkloads'],
    requiredComponents: [DataScienceStackComponent.KUEUE],
  },
  [SupportedArea.KUEUE]: {
    featureFlags: ['disableKueue'],
    requiredComponents: [DataScienceStackComponent.KUEUE],
  },
  [SupportedArea.MODEL_CATALOG]: {
    featureFlags: ['disableModelCatalog'],
    requiredComponents: [DataScienceStackComponent.MODEL_REGISTRY],
  },
  [SupportedArea.MCP_CATALOG]: {
    featureFlags: ['mcpCatalog'],
    requiredComponents: [DataScienceStackComponent.MODEL_REGISTRY],
  },
  [SupportedArea.MODEL_REGISTRY]: {
    featureFlags: ['disableModelRegistry'],
    requiredComponents: [DataScienceStackComponent.MODEL_REGISTRY],
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
  [SupportedArea.LM_EVAL]: {
    featureFlags: ['disableLMEval'],
    requiredComponents: [DataScienceStackComponent.TRUSTY_AI],
  },
  [SupportedArea.FEATURE_STORE]: {
    featureFlags: ['disableFeatureStore'],
    requiredComponents: [DataScienceStackComponent.FEATURE_STORE],
    customCondition: isFeastOperatorReady,
  },
  [SupportedArea.FEATURE_STORE_ADMIN]: {
    featureFlags: ['featureStoreAdmin'],
    reliantAreas: [SupportedArea.FEATURE_STORE],
  },
  [SupportedArea.DATA_REGISTRY]: {
    requiredComponents: [DataScienceStackComponent.DATA_REGISTRY],
    customCondition: isFeastOperatorReady,
  },
  [SupportedArea.MODEL_TRAINING]: {
    featureFlags: ['trainingJobs'],
    requiredComponents: [DataScienceStackComponent.TRAINER],
  },
  [SupportedArea.RAY_JOBS]: {
    featureFlags: ['trainingJobs'],
    requiredComponents: [DataScienceStackComponent.RAY],
  },
  [SupportedArea.AGENT_OPS]: {
    featureFlags: ['agentOps'],
  },
  [SupportedArea.AGENT_OPS_DEPLOY]: {
    featureFlags: ['agentOpsDeploy'],
  },
  [SupportedArea.AGENTS_CATALOG]: {
    featureFlags: ['agentsCatalog'],
    requiredComponents: [DataScienceStackComponent.MODEL_REGISTRY],
  },
  [SupportedArea.MLFLOW]: {
    requiredComponents: [DataScienceStackComponent.MLFLOW],
  },
  [SupportedArea.MLFLOW_PIPELINES]: {
    requiredComponents: [DataScienceStackComponent.DS_PIPELINES, DataScienceStackComponent.MLFLOW],
  },
  [SupportedArea.MCP_REGISTRY]: {
    featureFlags: ['mcpRegistry'],
    requiredComponents: [DataScienceStackComponent.MLFLOW],
  },
  [SupportedArea.SKILL_REGISTRY]: {
    featureFlags: ['skillRegistry'],
    requiredComponents: [DataScienceStackComponent.MLFLOW],
  },
  [SupportedArea.PROJECT_RBAC_SETTINGS]: {
    featureFlags: ['projectRBAC'],
  },
  [SupportedArea.ROLE_MANAGEMENT]: {
    featureFlags: ['roleManagement'],
  },
  [SupportedArea.YAML_VIEWER]: {
    featureFlags: ['deploymentWizardYAMLViewer'],
    reliantAreas: [SupportedArea.LLMD_SERVING],
  },
  [SupportedArea.VLLM_ON_MAAS]: {
    featureFlags: ['vLLMDeploymentOnMaaS'],
    reliantAreas: [SupportedArea.LLMD_SERVING],
  },
  [SupportedArea.LLMD_TOPOLOGY_CONFIGS]: {
    featureFlags: ['llmdTemplates'],
    reliantAreas: [SupportedArea.LLMD_SERVING],
  },
  [SupportedArea.LLMD_GATEWAY_FIELD]: {
    featureFlags: ['llmGatewayField'],
    reliantAreas: [SupportedArea.LLMD_SERVING],
  },
  [SupportedArea.PLUGIN_GEN_AI]: {
    featureFlags: ['genAiStudio'],
  },
  [SupportedArea.PLUGIN_AUTOML]: {
    featureFlags: ['automl', 'disablePipelines'],
    requiredComponents: [DataScienceStackComponent.DS_PIPELINES],
  },
  [SupportedArea.PLUGIN_AUTORAG]: {
    featureFlags: ['autorag', 'disablePipelines'],
    requiredComponents: [DataScienceStackComponent.DS_PIPELINES],
    reliantAreas: [SupportedArea.PLUGIN_GEN_AI],
  },
  [SupportedArea.GPUAAS_INFRASTRUCTURE]: {
    featureFlags: ['gpuaas'],
  },
  [SupportedArea.HARDWARE_PROFILE_DRA]: {
    featureFlags: ['hardwareProfileDRA'],
  },
  [SupportedArea.MODEL_CAPABILITIES]: {
    featureFlags: ['modelCapabilities'],
    reliantAreas: [SupportedArea.MODEL_SERVING],
  },
  [SupportedArea.PLUGIN_NOTEBOOKS]: {
    featureFlags: ['workbenchesV2'],
  },
  [SupportedArea.PLUGIN_DATA_REGISTRY]: {
    featureFlags: ['dataRegistry'],
    reliantAreas: [SupportedArea.DATA_REGISTRY],
  },
  [SupportedArea.GUIDED_TOUR]: {
    // Dev-only flag — not in OdhDashboardConfig CRD. On by default via devFlagDefaults.
    devFlags: ['guidedTour'],
  },
  [SupportedArea.UNIFIED_PROJECT_SELECTOR]: {
    // Dev-only gate — not in OdhDashboardConfig CRD. Off by default.
    devFlags: ['unifiedProjectSelector'],
  },
  [SupportedArea.PLUGIN_DATA_CONNECT_HUB]: {
    featureFlags: ['dataConnectHub'],
  },
  [SupportedArea.INFERENCE_PRIORITY_FIELD]: {
    featureFlags: ['inferencePriorityField'],
  },
};
