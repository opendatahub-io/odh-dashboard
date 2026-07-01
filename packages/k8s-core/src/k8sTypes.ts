import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type {
  HardwareProfileAnnotations,
  HardwareProfileScheduling,
  Identifier,
  ModelServingSize,
  NodeSelector,
  NotebookSize,
  PodAffinity,
  PodContainer,
  Toleration,
  Volume,
  AccessMode,
} from './types';

export type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

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
  group?: '*' | string;
  resource?: string;
  subresource?: '' | 'api' | 'spec' | 'status';
  verb: '*' | K8sVerb;
  name?: string;
  namespace?: string;
};

export enum KnownLabels {
  DASHBOARD_RESOURCE = 'opendatahub.io/dashboard',
  PROJECT_SHARING = 'opendatahub.io/project-sharing',
  MODEL_SERVING_PROJECT = 'modelmesh-enabled',
  DATA_CONNECTION_AWS = 'opendatahub.io/managed',
  LABEL_SELECTOR_MODEL_REGISTRY = 'component=model-registry',
  LABEL_SELECTOR_DATA_SCIENCE_PIPELINES = 'data-science-pipelines',
  PROJECT_SUBJECT = 'opendatahub.io/rb-project-subject',
  REGISTERED_MODEL_ID = 'modelregistry.opendatahub.io/registered-model-id',
  MODEL_VERSION_ID = 'modelregistry.opendatahub.io/model-version-id',
  MODEL_REGISTRY_NAME = 'modelregistry.opendatahub.io/name',
  KUEUE_MANAGED = 'kueue.openshift.io/managed',
  GLOBAL_MLFLOW_WORKSPACE = 'opendatahub.io/global-mlflow-workspace',
}

export enum MetadataAnnotation {
  StorageClassIsDefault = 'storageclass.kubernetes.io/is-default-class',
  K8sDescription = 'kubernetes.io/description',
  OdhStorageClassConfig = 'opendatahub.io/sc-config',
  Description = 'description',
  ConnectionName = 'opendatahub.io/connections',
}

export type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string;
  'openshift.io/display-name': string;
}>;

export type DashboardLabels = {
  [KnownLabels.DASHBOARD_RESOURCE]: 'true' | 'false';
};

export type ModelServingProjectLabels = {
  [KnownLabels.MODEL_SERVING_PROJECT]: 'false';
};

export type K8sCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string | null;
  lastTransitionTime?: string;
  lastHeartbeatTime?: string;
};

export type K8sDSGResource = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        'opendatahub.io/recommended-accelerators': string;
      }>;
    name: string;
  };
};

export type TemplateParameter = {
  name: string;
  displayName: string;
  description: string;
  value: string;
  required: boolean;
};

export type PodSpec = {
  affinity?: PodAffinity;
  enableServiceLinks?: boolean;
  containers: PodContainer[];
  initContainers?: PodContainer[];
  volumes?: Volume[];
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
};

export type PodContainerStatus = {
  name: string;
  ready: boolean;
  state?: {
    running?: boolean | undefined;
    waiting?: boolean | undefined;
    terminated?: boolean | undefined;
  };
};

export enum HardwareProfileFeatureVisibility {
  WORKBENCH = 'workbench',
  MODEL_SERVING = 'model-serving',
}

export type SupportedModelFormats = {
  name: string;
  version?: string;
  autoSelect?: boolean;
};

export type ProjectKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        'openshift.io/requester': string;
      }>;
    labels?: Partial<DashboardLabels> & Partial<ModelServingProjectLabels>;
    name: string;
  };
  status?: {
    phase: 'Active' | 'Terminating';
  };
};

export type SecretKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  data?: Record<string, string>;
  stringData?: Record<string, string>;
  type?: string;
};

export type PersistentVolumeClaimKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations;
    name: string;
    namespace: string;
  };
  spec: {
    accessModes: AccessMode[];
    resources: {
      requests: {
        storage: string;
      };
    };
    storageClassName?: string;
    volumeMode: 'Filesystem' | 'Block';
  };
  status?: {
    phase: string;
    capacity?: {
      storage: string;
    };
    conditions?: K8sCondition[];
  } & Record<string, unknown>;
};

export type PodKind = K8sResourceCommon & {
  metadata: {
    name: string;
  };
  spec: PodSpec;
  status?: {
    phase: string;
    conditions?: K8sCondition[];
    containerStatuses?: PodContainerStatus[];
  };
};

export type TemplateKind = K8sResourceCommon & {
  metadata: {
    annotations?: Partial<{
      tags: string;
      iconClass?: string;
      'opendatahub.io/template-enabled': string;
      'opendatahub.io/modelServingSupport': string;
      'opendatahub.io/apiProtocol': string;
      'opendatahub.io/model-type': string;
    }>;
    name: string;
    namespace: string;
  };
  objects: K8sDSGResource[];
  parameters: TemplateParameter[];
};

export type HardwareProfileKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: HardwareProfileAnnotations;
  };
  spec: {
    identifiers?: Identifier[];
    scheduling?: HardwareProfileScheduling;
  };
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
  llmdTopologyConfigs?: boolean;
  deploymentWizardYAMLViewer?: boolean;
  externalVectorStores?: boolean;
  agentConfigManagement?: boolean;
  vLLMDeploymentOnMaaS?: boolean;
  llmGatewayField?: boolean;
  promptManagement?: boolean;
  nimWizard?: boolean;
  mySubscriptions?: boolean;
  maasSettingsIaRedesign?: boolean;
  agentOps?: boolean;
  roleManagement?: boolean;
};

export type DashboardConfigKind = K8sResourceCommon & {
  spec: {
    dashboardConfig: DashboardCommonConfig;
    notebookSizes?: NotebookSize[];
    modelServerSizes?: ModelServingSize[];
    notebookController?: {
      enabled: boolean;
      pvcSize?: string;
      storageClassName?: string;
    };
    templateOrder?: string[];
    templateDisablement?: string[];
    hardwareProfileOrder?: string[];
    modelServing?: {
      deploymentStrategy?: string;
      isLLMdDefault?: boolean;
    };
    globalMLflowNamespaces?: string[];
    genAiStudioConfig?: {
      aiAssetCustomEndpoints?: {
        externalProviders?: boolean;
        clusterDomains?: string[];
      };
    };
  };
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
