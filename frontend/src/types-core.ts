/**
 * Core k8s types with no transitive imports into the frontend source tree.
 *
 * This file is safe to import from packages that should not pull in the full
 * frontend dependency graph (e.g. plugin-core). All leaf types are inlined
 * rather than imported from ./types to keep the import chain minimal.
 *
 * When adding types here, do NOT import from local modules (./types, #~/...).
 * Only import from external packages (@openshift/dynamic-plugin-sdk-utils).
 */

import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export type K8sCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string | null;
  lastTransitionTime?: string;
  lastHeartbeatTime?: string;
};

export type ManagementState = 'Managed' | 'Unmanaged' | 'Removed';

/** The possible V2 component names that are used as keys in the `components` object of the DSC Status.
 * Each component's key (e.g., 'kserve', 'dashboard', etc.) maps to a specific component status.
 **/
export enum DataScienceStackComponent {
  DASHBOARD = 'dashboard',
  DS_PIPELINES = 'aipipelines',
  K_SERVE = 'kserve',
  KUEUE = 'kueue',
  MODEL_REGISTRY = 'modelregistry',
  FEAST_OPERATOR = 'feastoperator',
  RAY = 'ray',
  TRAINING_OPERATOR = 'trainingoperator',
  TRUSTY_AI = 'trustyai',
  WORKBENCHES = 'workbenches',
  LLAMA_STACK_OPERATOR = 'llamastackoperator',
  OGX_OPERATOR = 'ogx',
  TRAINER = 'trainer',
  MLFLOW = 'mlflowoperator',
}

/** Represents the status of a component in the DataScienceCluster. */
export type DataScienceClusterComponentStatus = {
  managementState?: ManagementState;
  releases?: Array<{
    name: string;
    repoUrl?: string;
    version?: string;
  }>;
};

/** We don't need or should ever get the full kind, this is the status section */
export type DataScienceClusterKindStatus = {
  components?: {
    [key in DataScienceStackComponent]?: DataScienceClusterComponentStatus;
  } & {
    [DataScienceStackComponent.MODEL_REGISTRY]?: DataScienceClusterComponentStatus & {
      registriesNamespace?: string;
    };
    [DataScienceStackComponent.WORKBENCHES]?: DataScienceClusterComponentStatus & {
      workbenchNamespace?: string;
    };
  };
  conditions: K8sCondition[];
  phase?: string;
  release?: {
    name: string;
    version: string;
  };
};

export type DataScienceClusterInitializationKindStatus = {
  conditions: K8sCondition[];
  release?: {
    name?: string;
    version?: string;
  };
  components?: Record<string, never>;
  phase?: string;
};

export type K8sVerb =
  | 'create'
  | 'get'
  | 'list'
  | 'update'
  | 'patch'
  | 'delete'
  | 'deletecollection'
  | 'watch';

export type AccessReviewResourceAttributes = {
  /** CRD group, '*' for all groups, omit for core resources */
  group?: '*' | string;
  /** Plural resource name, omit for all */
  resource?: string;
  /** TODO: Not a full list, could be expanded, "" means none */
  subresource?: '' | 'api' | 'spec' | 'status';
  /** Must provide the verb you are trying to do; '*' means all verbs */
  verb: '*' | K8sVerb;
  /** A resource name, omit when not interested in a specific resource */
  name?: string;
  /** The namespace the check is in, omit for unbounded check */
  namespace?: string;
};

export type DashboardCommonConfig = {
  enablement: boolean;
  disableInfo: boolean;
  disableSupport: boolean;
  disableClusterManager: boolean;
  disableTracking: boolean;
  disableBYONImageStream: boolean;
  disableISVBadges: boolean;
  disableAppLauncher: boolean;
  disableUserManagement: boolean;
  disableHome: boolean;
  disableProjects: boolean;
  disableModelServing: boolean;
  disableProjectScoped: boolean;
  disableProjectSharing: boolean;
  disableCustomServingRuntimes: boolean;
  disablePipelines: boolean;
  disableTrustyBiasMetrics: boolean;
  disablePerformanceMetrics: boolean;
  disableKServe: boolean;
  disableKServeAuth: boolean;
  disableKServeMetrics: boolean;
  disableKServeRaw: boolean;
  disableDistributedWorkloads: boolean;
  disableModelCatalog: boolean;
  disableModelRegistry: boolean;
  disableModelRegistrySecureDB: boolean;
  disableServingRuntimeParams: boolean;
  disableStorageClasses: boolean;
  disableNIMModelServing: boolean;
  disableAdminConnectionTypes: boolean;
  disableFineTuning: boolean;
  disableLMEval: boolean;
  disableKueue: boolean;
  trainingJobs: boolean;
  disableFeatureStore?: boolean;
  genAiStudio?: boolean;
  guardrails?: boolean;
  automl?: boolean;
  autorag?: boolean;
  modelAsService?: boolean;
  maasAuthPolicies?: boolean;
  aiAssetCustomEndpoints?: boolean;
  mlflowPipelines?: boolean;
  mcpCatalog?: boolean;
  toolCalling?: boolean;
  projectRBAC?: boolean;
  observabilityDashboard?: boolean;
  disableLLMd?: boolean;
  deploymentWizardYAMLViewer?: boolean;
  externalVectorStores?: boolean;
  vLLMDeploymentOnMaaS?: boolean;
  llmGatewayField?: boolean;
  promptManagement?: boolean;
  nimWizard?: boolean;
  mySubscriptions?: boolean;
  agentOps?: boolean;
  roleManagement?: boolean;
  agentProfileManagement?: boolean;
};

// [1] Intentionally disjointed fields from the CRD in this type definition
// but still present in the CRD until we upgrade the CRD version.
export type DashboardConfigKind = K8sResourceCommon & {
  spec: {
    dashboardConfig: DashboardCommonConfig;
    // Intentionally disjointed from the CRD [1]
    // groupsConfig?: {
    notebookSizes?: {
      name: string;
      resources: {
        requests?: {
          [key: string]: number | string | undefined;
          cpu?: string | number;
          memory?: string;
        };
        limits?: {
          [key: string]: number | string | undefined;
          cpu?: string | number;
          memory?: string;
        };
      };
      notUserDefined?: boolean;
    }[]; // deprecated
    modelServerSizes?: {
      name: string;
      resources: {
        requests?: {
          [key: string]: number | string | undefined;
          cpu?: string | number;
          memory?: string;
        };
        limits?: {
          [key: string]: number | string | undefined;
          cpu?: string | number;
          memory?: string;
        };
      };
    }[]; // deprecated
    notebookController?: {
      enabled: boolean;
      pvcSize?: string;
      storageClassName?: string;
      // Intentionally disjointed from the CRD [1]
      // notebookNamespace?: string;
      // Intentionally disjointed from the CRD [1]
      // notebookTolerationSettings?: TolerationSettings;
    };
    templateOrder?: string[];
    templateDisablement?: string[];
    hardwareProfileOrder?: string[];
    modelServing?: {
      deploymentStrategy?: string;
      isLLMdDefault?: boolean;
    };
    genAiStudioConfig?: {
      aiAssetCustomEndpoints?: {
        externalProviders?: boolean;
        clusterDomains?: string[];
      };
    };
  };
};
