import type { DashboardCommonConfig, DashboardConfigKind } from '@odh-dashboard/k8s-core';
import {
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
  DataScienceStackComponent,
} from '@odh-dashboard/k8s-core';

export { DataScienceStackComponent } from '@odh-dashboard/k8s-core';

type Never<Type> = {
  [K in keyof Type]?: never;
};

type EitherNotBoth<TypeA, TypeB> = (TypeA & Never<TypeB>) | (TypeB & Never<TypeA>);

type EitherOrBoth<TypeA, TypeB> = EitherNotBoth<TypeA, TypeB> | (TypeA & TypeB);

export type FeatureFlag = keyof DashboardCommonConfig;

export type IsAreaAvailableStatus = {
  /** A single boolean status */
  status: boolean;
  /* Each status portion broken down -- null if no check made */
  devFlags: { [key in string]?: 'on' | 'off' } | null;
  featureFlags: { [key in FeatureFlag]?: 'on' | 'off' } | null;
  reliantAreas: { [key in SupportedAreaType]?: boolean } | null;
  requiredCapabilities: { [key in StackCapability]?: boolean } | null;
  requiredComponents: { [key in DataScienceStackComponent]?: boolean } | null;
  customCondition: (conditionFunc: CustomConditionFunction) => boolean;
};

/** All areas that we need to support in some fashion or another */
export enum SupportedArea {
  HOME = 'home',

  /* Standalone areas */
  WORKBENCHES = 'workbenches',

  /* Pipelines areas */
  DS_PIPELINES = 'ds-pipelines',

  /* Admin areas */
  BYON = 'bring-your-own-notebook',
  CLUSTER_SETTINGS = 'cluster-settings',
  USER_MANAGEMENT = 'user-management',
  STORAGE_CLASSES = 'storage-classes',
  ADMIN_CONNECTION_TYPES = 'connection-types',
  FINE_TUNING = 'fine-tuning',

  /* DS Projects specific areas */
  DS_PROJECTS_PERMISSIONS = 'ds-projects-permission',
  DS_PROJECTS_VIEW = 'ds-projects',
  DS_PROJECT_SCOPED = 'ds-project-scoped',

  /* Model Serving areas */
  MODEL_SERVING = 'model-serving-shell',
  CUSTOM_RUNTIMES = 'custom-serving-runtimes',
  K_SERVE = 'kserve',
  K_SERVE_AUTH = 'kserve-auth',
  K_SERVE_METRICS = 'kserve-metrics',
  K_SERVE_RAW = 'kserve-raw',
  BIAS_METRICS = 'bias-metrics',
  PERFORMANCE_METRICS = 'performance-metrics',
  TRUSTY_AI = 'trusty-ai',
  NIM_MODEL = 'nim-model',
  NIM_WIZARD = 'nim-wizard',
  SERVING_RUNTIME_PARAMS = 'serving-runtime-params',
  MODEL_AS_SERVICE = 'model-as-service',
  MAAS_AUTH_POLICIES = 'maas-auth-policies',
  LLMD_SERVING = 'llmd-serving',
  LLMD_TOPOLOGY_CONFIGS = 'llmd-topology-configs',
  YAML_VIEWER = 'yaml-viewer',
  VLLM_ON_MAAS = 'vllm-on-maas',
  LLMD_GATEWAY_FIELD = 'llmd-gateway-field',
  MY_SUBSCRIPTIONS = 'my-subscriptions',
  MAAS_SETTINGS_IA_REDESIGN = 'maas-settings-ia-redesign',

  /* Distributed Workloads areas */
  DISTRIBUTED_WORKLOADS = 'distributed-workloads',
  KUEUE = 'kueue',

  /* Model Registry areas */
  MODEL_REGISTRY = 'model-registry',
  MODEL_REGISTRY_SECURE_DB = 'model-registry-secure-db',
  /* Model catalog areas */
  MODEL_CATALOG = 'model-catalog',

  /* MCP catalog areas */
  MCP_CATALOG = 'mcp-catalog',

  /* Plugins */
  PLUGIN_MODEL_SERVING = 'plugin-model-serving',
  PLUGIN_GEN_AI = 'plugin-gen-ai',

  /* RAG & Agentic */
  LLAMA_STACK_CHAT_BOT = 'llama-stack-chat-bot',

  /* LM Eval */
  LM_EVAL = 'lm-eval',

  /* Feature store */
  FEATURE_STORE = 'feature-store',

  /* Model Training */
  MODEL_TRAINING = 'model-training',
  RAY_JOBS = 'ray-jobs',

  /* Agent Ops */
  AGENT_OPS = 'agent-ops',

  /* MLflow */
  MLFLOW = 'mlflow',
  MLFLOW_PIPELINES = 'mlflow-pipelines',

  /* Project RBAC Settings */
  PROJECT_RBAC_SETTINGS = 'project-rbac-settings',

  /* Role Management */
  ROLE_MANAGEMENT = 'role-management',
}

export type SupportedAreaType = SupportedArea | string;

/**
 * Capabilities of the Operator. Part of the DSCI Status.
 * Preserved as string type for future capabilities.
 */
export type StackCapability = string;

/**
 * Optional function to check for a condition that is not covered by other checks.
 */
export type CustomConditionFunction = (state: {
  dashboardConfigSpec: DashboardConfigKind['spec'];
  dscStatus: DataScienceClusterKindStatus | null;
  dsciStatus: DataScienceClusterInitializationKindStatus | null;
}) => boolean;

export type SupportedComponentFlagValue = {
  reliantAreas?: SupportedAreaType[];
  requiredCapabilities?: StackCapability[];
} & EitherOrBoth<
  {
    devFlags?: string[];
  },
  EitherOrBoth<
    {
      featureFlags: FeatureFlag[];
    },
    EitherOrBoth<
      {
        requiredComponents: DataScienceStackComponent[];
      },
      {
        customCondition: CustomConditionFunction;
      }
    >
  >
>;

export type SupportedAreasState = {
  [key in SupportedAreaType]: SupportedComponentFlagValue;
};
