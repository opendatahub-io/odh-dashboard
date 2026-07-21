import type { K8sResourceCommon, MatchExpression } from '@openshift/dynamic-plugin-sdk-utils';
import type {
  ContainerResourceAttributes,
  HardwareProfileAnnotations,
  HardwareProfileBindingAnnotations,
  HardwareProfileScheduling,
  Identifier,
  ImagePullSecret,
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

export type K8sAPIOptions = {
  dryRun?: boolean;
  signal?: AbortSignal;
  parseJSON?: boolean;
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
  group?: '*' | string;
  resource?: string;
  subresource?: '' | 'api' | 'spec' | 'status';
  verb: '*' | K8sVerb;
  name?: string;
  namespace?: string;
};

export const MODELS_AS_A_SERVICE_READY = 'ModelsAsAServiceReady';

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

/**
 * @deprecated accelerator profiles are being removed; only in deprecation paths
 * modelmesh: RHOAIENG-34917, RHOAIENG-19185
 * fine-tuning: RHOAIENG-36276, RHOAIENG-34285
 */
export type AcceleratorProfileKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: Partial<{
      'opendatahub.io/modified-date': string;
    }>;
  };
  spec: {
    displayName: string;
    enabled: boolean;
    identifier: string;
    description?: string;
    tolerations?: Toleration[];
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
  featureStoreAdmin?: boolean;
  genAiStudio?: boolean;
  guardrails?: boolean;
  genAiTracing?: boolean;
  automl?: boolean;
  autorag?: boolean;
  modelAsService?: boolean;
  externalModels?: boolean;
  aiAssetCustomEndpoints?: boolean;
  mlflowPipelines?: boolean;
  mcpCatalog?: boolean;
  mcpRegistry?: boolean;
  toolCalling?: boolean;
  projectRBAC?: boolean;
  observabilityDashboard?: boolean;
  disableLLMd?: boolean;
  llmdTemplates?: boolean;
  deploymentWizardYAMLViewer?: boolean;
  externalVectorStores?: boolean;
  agentConfigManagement?: boolean;
  vLLMDeploymentOnMaaS?: boolean;
  llmGatewayField?: boolean;
  promptManagement?: boolean;
  globalProjectPrompts?: boolean;
  nimWizard?: boolean;
  mySubscriptions?: boolean;
  agentOps?: boolean;
  agentOpsDeploy?: boolean;
  agentsCatalog?: boolean;
  roleManagement?: boolean;
  gpuaas?: boolean;
  connectionTest?: boolean;
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

export type ConfigMapKind = K8sResourceCommon & {
  metadata: {
    name: string;
  };
  data?: Record<string, string>;
};

export type EventKind = K8sResourceCommon & {
  metadata: {
    uid?: string;
  };
  involvedObject: {
    name: string;
    uid?: string;
    kind?: string;
  };
  lastTimestamp?: string;
  eventTime: string;
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
};

type StorageClassAnnotations = Partial<{
  [MetadataAnnotation.StorageClassIsDefault]: 'true' | 'false';
  [MetadataAnnotation.K8sDescription]: string;
  [MetadataAnnotation.OdhStorageClassConfig]: string;
}>;

export type StorageClassKind = K8sResourceCommon & {
  metadata: {
    annotations?: StorageClassAnnotations;
    name: string;
  };
  provisioner: string;
  parameters?: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  allowVolumeExpansion?: boolean;
};

export type NotebookAnnotations = Partial<{
  'kubeflow-resource-stopped': string | null;
  'notebooks.kubeflow.org/last-activity': string;
  'opendatahub.io/user': string;
  'opendatahub.io/username': string;
  'notebooks.opendatahub.io/last-image-selection': string;
  'opendatahub.io/image-display-name': string;
  'notebooks.opendatahub.io/last-image-version-git-commit-selection': string;
  'opendatahub.io/workbench-image-namespace': string | null;
  'opendatahub.io/connections': string | undefined;
}> &
  Partial<HardwareProfileBindingAnnotations>;

export type NotebookKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations & NotebookAnnotations;
    name: string;
    namespace: string;
  };
  spec: {
    template: {
      spec: PodSpec;
    };
  };
  status?: {
    containerState?: {
      terminated?: { [key: string]: string };
    };
    readyReplicas?: number;
  };
};

export type RoleBindingSubject = {
  kind: string;
  apiGroup?: string;
  name: string;
};

export type RoleBindingRoleRef = {
  kind: 'Role' | 'ClusterRole';
  apiGroup?: string;
  name: string;
};

export type ResourceRule = {
  verbs: string[];
  apiGroups?: string[];
  resourceNames?: string[];
  resources?: string[];
};

export type RoleKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  rules?: ResourceRule[];
};

export type RoleBindingKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  subjects?: RoleBindingSubject[];
  roleRef: RoleBindingRoleRef;
};

export type TrustyAIKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    storage:
      | {
          format: 'DATABASE';
          databaseConfigurations: string;
        }
      | {
          format: 'PVC';
          folder: string;
          size: string;
        };
    data?: {
      filename: string;
      format: string;
    };
    metrics: {
      schedule: string;
      batchSize?: number;
    };
  };
  status?: {
    conditions?: K8sCondition[];
    phase?: string;
    ready?: string;
    replicas?: number;
  };
};

export enum DSPAMlflowIntegrationMode {
  DISABLED = 'DISABLED',
  AUTODETECT = 'AUTODETECT',
}

type ClusterQueueFlavorUsage = {
  name: string;
  resources: {
    name: ContainerResourceAttributes;
    borrowed?: string | number;
    total?: string | number;
  }[];
};

export type ClusterQueueKind = K8sResourceCommon & {
  apiVersion: 'kueue.x-k8s.io/v1beta2';
  kind: 'ClusterQueue';
  spec: {
    admissionChecksStrategy?: {
      admissionChecks: {
        name: string;
        onFlavors?: string[];
      }[];
    };
    cohortName?: string;
    flavorFungibility?: {
      whenCanBorrow: 'Borrow' | 'TryNextFlavor';
      whenCanPreempt: 'Preempt' | 'TryNextFlavor';
    };
    namespaceSelector?: {
      matchExpressions?: MatchExpression[];
      matchLabels?: Record<string, string>;
    };
    preemption?: {
      borrowWithinCohort?: {
        maxPriorityThreshold?: number;
        policy?: 'Never' | 'LowerPriority';
      };
      reclaimWithinCohort?: 'Never' | 'LowerPriority' | 'Any';
      withinClusterQueue?: 'Never' | 'LowerPriority' | 'LowerOrNewerEqualPriority';
    };
    queueingStrategy?: 'StrictFIFO' | 'BestEffortFIFO';
    resourceGroups?: {
      coveredResources: ContainerResourceAttributes[];
      flavors: {
        name: string;
        resources: {
          name: ContainerResourceAttributes;
          nominalQuota: string | number;
        }[];
      }[];
    }[];
    stopPolicy?: 'None' | 'Hold' | 'HoldAndDrain';
  };
  status?: {
    flavorsReservation?: ClusterQueueFlavorUsage[];
    flavorsUsage?: ClusterQueueFlavorUsage[];
    pendingWorkloads?: number;
    reservingWorkloads?: number;
    admittedWorkloads?: number;
    conditions?: {
      lastTransitionTime: string;
      message: string;
      observedGeneration?: number;
      reason: string;
      status: 'True' | 'False' | 'Unknown';
      type: string;
    }[];
    pendingWorkloadsStatus?: {
      clusterQueuePendingWorkload?: {
        name: string;
        namespace: string;
      }[];
      lastChangeTime: string;
    };
  };
};

type LocalQueueFlavorUsage = {
  name: string;
  resources: {
    name: ContainerResourceAttributes;
    total?: string | number;
  }[];
};

export type LocalQueueKind = K8sResourceCommon & {
  apiVersion: 'kueue.x-k8s.io/v1beta2';
  kind: 'LocalQueue';
  spec: {
    clusterQueue: string;
  };
  status?: {
    flavorsReservation?: LocalQueueFlavorUsage[];
    flavorsUsage?: LocalQueueFlavorUsage[];
    pendingWorkloads?: number;
    reservingWorkloads?: number;
    admittedWorkloads?: number;
    conditions?: {
      lastTransitionTime: string;
      message: string;
      observedGeneration?: number;
      reason: string;
      status: 'True' | 'False' | 'Unknown';
      type: string;
    }[];
  };
};

type WorkloadPodAffinityTerm = {
  labelSelector?: {
    matchExpressions?: MatchExpression[];
    matchLabels?: Record<string, string>;
  };
  matchLabelKeys?: string[];
  mismatchLabelKeys?: string[];
  namespaceSelector?: {
    matchExpressions?: MatchExpression[];
    matchLabels?: Record<string, string>;
  };
  namespaces?: string[];
  topologyKey: string;
};

export type WorkloadPodSet = {
  count: number;
  minCount?: number;
  name: string;
  template: {
    metadata?: K8sResourceCommon['metadata'];
    spec: {
      activeDeadlineSeconds?: number;
      affinity?: {
        nodeAffinity?: {
          preferredDuringSchedulingIgnoredDuringExecution: {
            preference: {
              matchExpressions?: MatchExpression[];
              matchFields?: MatchExpression[];
            };
            weight: number;
          }[];
          requiredDuringSchedulingIgnoredDuringExecution: {
            nodeSelectorTerms: {
              matchExpressions?: MatchExpression[];
              matchFields?: MatchExpression[];
            }[];
          };
        };
        podAffinity?: {
          preferredDuringSchedulingIgnoredDuringExecution?: {
            podAffinityTerm: WorkloadPodAffinityTerm;
            weight: number;
          }[];
          requiredDuringSchedulingIgnoredDuringExecution?: WorkloadPodAffinityTerm[];
          weight: number;
        }[];
        podAntiAffinity?: {
          preferredDuringSchedulingIgnoredDuringExecution?: {
            podAffinityTerm: WorkloadPodAffinityTerm;
            weight: number;
          }[];
          requiredDuringSchedulingIgnoredDuringExecution?: WorkloadPodAffinityTerm[];
          weight: number;
        };
      };
      automountServiceAccountToken?: boolean;
      containers: PodContainer[];
      dnsConfig?: {
        nameservers?: string[];
        options?: {
          name: string;
          value?: string;
        }[];
        searches?: string[];
      };
      dnsPolicy?: string;
      enableServiceLinks?: boolean;
      ephemeralContainers?: PodContainer[];
      hostAliases?: {
        hostnames?: string[];
        ip: string;
      }[];
      hostIPC?: boolean;
      hostNetwork?: boolean;
      hostPID?: boolean;
      hostUsers?: boolean;
      hostname?: string;
      imagePullSecrets?: ImagePullSecret[];
      initContainers?: PodContainer[];
      nodeName?: string;
      nodeSelector?: Record<string, string>;
      os?: { name: string };
      overhead?: Record<string, string | number>;
      preemptionPolicy?: string;
      priority?: number;
      priorityClassName?: string;
      readinessGates?: {
        conditionType: string;
      }[];
      resourceClaims?: {
        name: string;
        source?: {
          resourceClaimName?: string;
          resourceClaimTemplateName: string;
        };
      }[];
      restartPolicy?: string;
      runtimeClassName?: string;
      schedulerName?: string;
      schedulingGates?: {
        name: string;
      }[];
      securityContext?: {
        fsGroup?: number;
        fsGroupChangePolicy?: string;
        runAsGroup?: number;
        runAsNonRoot?: boolean;
        runAsUser?: number;
        seLinuxOptions?: {
          level?: string;
          role?: string;
          type?: string;
          user?: string;
        };
        seccompProfile?: {
          localhostProfile?: string;
          type: string;
        };
        supplementalGroups?: number[];
        sysctls?: {
          name: string;
          value: string;
        }[];
        windowsOptions?: {
          gmsaCredentialSpec?: string;
          gmsaCredentialSpecName?: string;
          hostProcess?: string;
          runAsUserName?: string;
        };
      };
      serviceAccount?: string;
      serviceAccountName?: string;
      setHostnameAsFQDN?: boolean;
      shareProcessNamespace?: boolean;
      subdomain?: string;
      terminationGracePeriodSeconds?: number;
      tolerations?: {
        effect?: string;
        key?: string;
        operator?: string;
        tolerationSeconds?: number;
        value?: string;
      }[];
      topologySpreadConstraints?: {
        labelSelector?: {
          matchExpressions?: MatchExpression[];
          matchLabels?: Record<string, string>;
        };
        matchLabelKeys?: [];
        maxSkew: number;
        minDomains?: number;
        nodeAffinityPolicy?: string;
        nodeTaintsPolicy?: string;
        topologyKey: string;
        whenUnsatisfiable: string;
      }[];
      volumes?: {
        name: string;
        [key: string]: unknown;
      }[];
    };
  };
};

export enum WorkloadOwnerType {
  RayCluster = 'RayCluster',
  Job = 'Job',
  StatefulSet = 'StatefulSet',
  ReplicaSet = 'ReplicaSet',
}

export type WorkloadKind = K8sResourceCommon & {
  apiVersion: 'kueue.x-k8s.io/v1beta2';
  kind: 'Workload';
  spec: {
    active?: boolean;
    podSets: WorkloadPodSet[];
    priority?: number;
    priorityClassRef?: {
      group: string;
      kind: string;
      name: string;
    };
    queueName?: string;
  };
  status?: {
    admission?: {
      clusterQueue: string;
      podSetAssignments: {
        name: string;
        count?: number;
        flavors?: Record<string, string>;
        resourceUsage?: Record<string, string | number>;
      }[];
    };
    admissionChecks?: {
      name: string;
      message: string;
      state: 'Pending' | 'Ready' | 'Retry' | 'Rejected';
      lastTransitionTime: string;
      podSetUpdates?: {
        annotations?: Record<string, string>;
        labels?: Record<string, string>;
        name: string;
        nodeSelector?: Record<string, string>;
        tolerations?: Toleration[];
      }[];
    }[];
    conditions?: WorkloadCondition[];
    reclaimablePods?: {
      count: number;
      name: string;
    }[];
    requeueState?: {
      count?: number;
      requeueAt?: string;
    };
  };
};

export type WorkloadConditionType =
  | 'QuotaReserved'
  | 'Admitted'
  | 'PodsReady'
  | 'Finished'
  | 'Evicted'
  | 'Preempted';

export type WorkloadCondition = {
  lastTransitionTime: string;
  message: string;
  observedGeneration?: number;
  reason: string;
  status: 'True' | 'False' | 'Unknown';
  type: WorkloadConditionType | (string & NonNullable<unknown>);
};

export type CohortKind = K8sResourceCommon & {
  apiVersion: 'kueue.x-k8s.io/v1beta2';
  kind: 'Cohort';
  spec: {
    parentName?: string;
    resourceGroups?: {
      coveredResources: ContainerResourceAttributes[];
      flavors: {
        name: string;
        resources: {
          name: ContainerResourceAttributes;
          nominalQuota: string | number;
          borrowingLimit?: string | number;
          lendingLimit?: string | number;
        }[];
      }[];
    }[];
    fairSharing?: {
      weight?: string | number;
    };
  };
  status?: {
    fairSharing?: {
      weightedShare: number;
    };
  };
};

export type ResourceFlavorKind = K8sResourceCommon & {
  apiVersion: 'kueue.x-k8s.io/v1beta2';
  kind: 'ResourceFlavor';
  spec: {
    nodeLabels?: Record<string, string>;
    nodeTaints?: {
      key: string;
      value?: string;
      effect: 'NoSchedule' | 'NoExecute' | 'PreferNoSchedule';
    }[];
    tolerations?: Toleration[];
    topologyName?: string;
  };
};

export type ServiceKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        'routing.opendatahub.io/external-address-rest': string;
        'routing.opendatahub.io/external-address-grpc': string;
      }>;
    name: string;
    namespace: string;
    labels?: Partial<{
      component: string;
    }>;
  };
  spec: {
    selector: {
      app: string;
      component: string;
    };
    ports: {
      name?: string;
      protocol?: string;
      appProtocol?: string;
      port?: number;
      targetPort?: number | string;
    }[];
  };
};

export type NIMAccountKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    apiKeySecret: {
      name: string;
    };
  };
  status?: {
    nimConfig?: {
      name: string;
    };
    runtimeTemplate?: {
      name: string;
    };
    nimPullSecret?: {
      name: string;
    };
    conditions?: K8sCondition[];
  };
};

export type ConfigSecretItem = {
  name: string;
  keys: string[];
};
