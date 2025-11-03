import { K8sResourceCommon, MatchExpression } from '@openshift/dynamic-plugin-sdk-utils';
import { EitherNotBoth } from '@openshift/dynamic-plugin-sdk';
import { AwsKeys } from '#~/pages/projects/dataConnections/const';
import type { DataScienceStackComponent } from '#~/concepts/areas/types';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import {
  ContainerResourceAttributes,
  ContainerResources,
  Identifier,
  HardwareProfileScheduling,
  ImageStreamStatusTagCondition,
  ImageStreamStatusTagItem,
  NodeSelector,
  NotebookSize,
  PodAffinity,
  PodContainer,
  Toleration,
  Volume,
  VolumeMount,
  HardwareProfileAnnotations,
} from './types';
import { ModelServingSize } from './pages/modelServing/screens/types';

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
}

export type ModelRegistry = {
  name: string;
  displayName: string;
  description: string;
  serverAddress?: string;
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

/**
 * Annotations that we will use to allow the user flexibility in describing items outside of the
 * k8s structure.
 */
export type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string; // the description provided by the user
  'openshift.io/display-name': string; // the name provided by the user
}>;

export type AccessModeSettings = Partial<Record<AccessMode, boolean>>;

export type StorageClassConfig = {
  displayName: string;
  isEnabled: boolean;
  isDefault: boolean;
  lastModified: string;
  description?: string;
  accessModeSettings?: AccessModeSettings;
};

export enum MetadataAnnotation {
  StorageClassIsDefault = 'storageclass.kubernetes.io/is-default-class',
  K8sDescription = 'kubernetes.io/description',
  OdhStorageClassConfig = 'opendatahub.io/sc-config',
  Description = 'description',
  ConnectionName = 'opendatahub.io/connections',
}

type StorageClassAnnotations = Partial<{
  // if true, enables any persistent volume claim (PVC) that does not specify a specific storage class to automatically be provisioned.
  // Only one, if any, StorageClass per cluster can be set as default.
  [MetadataAnnotation.StorageClassIsDefault]: 'true' | 'false';
  // the description provided by the cluster admin or Container Storage Interface (CSI) provider
  [MetadataAnnotation.K8sDescription]: string;
  [MetadataAnnotation.OdhStorageClassConfig]: string;
}>;

export type K8sDSGResource = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        'opendatahub.io/recommended-accelerators': string;
      }>;
    name: string;
  };
};

type ImageStreamAnnotations = Partial<{
  'opendatahub.io/notebook-image-desc': string;
  'opendatahub.io/notebook-image-name': string;
  'opendatahub.io/notebook-image-url': string;
  'opendatahub.io/notebook-image-order': string;
}>;

type ImageStreamSpecTagAnnotations = Partial<{
  'opendatahub.io/notebook-python-dependencies': string;
  'opendatahub.io/notebook-software': string;
  'opendatahub.io/workbench-image-recommended': string;
  'opendatahub.io/default-image': string;
  'opendatahub.io/image-tag-outdated': string;
  'opendatahub.io/notebook-build-commit': string;
  'openshift.io/imported-from': string;
}>;

export type NotebookAnnotations = Partial<{
  'kubeflow-resource-stopped': string | null; // datestamp of stop (if omitted, it is running),  `odh-notebook-controller-lock` is set when first creating the notebook to avoid race conditions, it's a fake stop
  'notebooks.kubeflow.org/last-activity': string; // datestamp of last use
  'opendatahub.io/username': string; // the untranslated username behind the notebook
  'notebooks.opendatahub.io/last-image-selection': string; // the last image they selected
  'notebooks.opendatahub.io/last-size-selection': string; // the last notebook size they selected
  'opendatahub.io/accelerator-name': string; // the accelerator attached to the notebook
  'opendatahub.io/hardware-profile-name': string; // the hardware profile attached to the notebook
  'opendatahub.io/image-display-name': string; // the display name of the image
  'notebooks.opendatahub.io/last-image-version-git-commit-selection': string; // the build commit of the last image they selected
  'opendatahub.io/hardware-profile-namespace': string | null; // the namespace of the hardware profile used
  'opendatahub.io/workbench-image-namespace': string | null; // namespace of the
  'opendatahub.io/accelerator-profile-namespace': string | undefined; // the namespace of the accelerator profile used
  'opendatahub.io/connections': string | undefined; // the connections attached to the notebook
  'opendatahub.io/hardware-profile-resource-version': string; // resource version of hardware profile when assigned
}>;

export type DashboardLabels = {
  [KnownLabels.DASHBOARD_RESOURCE]: 'true' | 'false';
};

export type ModelServingProjectLabels = {
  [KnownLabels.MODEL_SERVING_PROJECT]: 'true' | 'false';
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

// from: https://github.com/opendatahub-io/data-science-pipelines-operator/blob/9b518e02ee794d0afbe2b9ad35c85be10051ce6e/controllers/config/defaults.go#L127-L138
export enum K8sDspaConditionReason {
  MinimumReplicasAvailable = 'MinimumReplicasAvailable',
  FailingToDeploy = 'FailingToDeploy',
  ComponentDeploymentNotFound = 'ComponentDeploymentNotFound',
  UnsupportedVersion = 'UnsupportedVersion',
  Deploying = 'Deploying',
  NotApplicable = 'NotApplicable',
}

export type ServingRuntimeAnnotations = Partial<{
  'opendatahub.io/template-name': string;
  'opendatahub.io/template-display-name': string;
  'opendatahub.io/disable-gpu': string;
  'opendatahub.io/recommended-accelerators': string;
  'opendatahub.io/accelerator-name': string;
  'opendatahub.io/apiProtocol': string;
  'opendatahub.io/serving-runtime-scope': string;
  'opendatahub.io/accelerator-profile-namespace': string | undefined;
  'enable-route': string;
  'enable-auth': string;
  'modelmesh-enabled': 'true' | 'false';
}>;

export type BuildConfigKind = K8sResourceCommon & {
  metadata: {
    name: string;
    labels?: Partial<{
      'opendatahub.io/notebook-name': string;
    }>;
  };
  spec: {
    output: {
      to: {
        name: string;
      };
    };
  };
};

export type BuildKind = K8sResourceCommon & {
  metadata: {
    name: string;
    annotations?: Partial<{
      'openshift.io/build.number': string;
    }>;
    labels?: Partial<{
      buildconfig: string;
      'openshift.io/build-config.name': string;
    }>;
  };
  spec: {
    output: {
      to: {
        name: string;
      };
    };
  };
  status: {
    phase: BuildPhase;
    completionTimestamp?: string;
    startTimestamp?: string;
  };
};

/**
 * Contains all the phases for BuildKind -> status -> phase (excluding NONE phase)
 */
export enum BuildPhase {
  NONE = 'Not started',
  NEW = 'New',
  RUNNING = 'Running',
  PENDING = 'Pending',
  COMPLETE = 'Complete',
  FAILED = 'Failed',
  ERROR = 'Error',
  CANCELLED = 'Cancelled',
}

export type ConfigMapKind = K8sResourceCommon & {
  metadata: {
    name: string;
  };
  data?: Record<string, string>;
};

export type ConsoleLinkKind = {
  spec: {
    text: string;
    location: string;
    href: string;
    applicationMenu?: {
      section: string;
      imageURL: string;
    };
  };
} & K8sResourceCommon;

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

export type ImageStreamKind = K8sResourceCommon & {
  metadata: {
    annotations?: ImageStreamAnnotations;
    name: string;
  };
  spec: {
    tags?: ImageStreamSpecTagType[];
    lookupPolicy?: {
      local: boolean;
    };
  };
  status?: {
    dockerImageRepository?: string;
    publicDockerImageRepository?: string;
    tags?: ImageStreamStatusTag[];
  };
};

export type ImageStreamStatusTag = {
  tag: string;
  items: ImageStreamStatusTagItem[] | null;
  conditions?: ImageStreamStatusTagCondition[];
};

export type ImageStreamSpecTagType = {
  name: string;
  annotations?: ImageStreamSpecTagAnnotations;
  from?: {
    kind: string;
    name: string;
  };
};

export type K8sAPIOptions = {
  dryRun?: boolean;
  signal?: AbortSignal;
  parseJSON?: boolean;
};

export type QuickStartTask = {
  description: string;
  review: {
    failedTaskHelp: string;
    instructions: string;
  };
  summary: {
    failed: string;
    success: string;
  };
  title: string;
};

export type OdhQuickStart = K8sResourceCommon & {
  metadata: {
    name: string;
    annotations?: { [key: string]: string };
  };
  spec: {
    appName: string;
    conclusion: string;
    description: string;
    displayName: string;
    durationMinutes?: number;
    icon?: string;
    introduction: string;
    nextQuickStart: string[];
    prerequisites?: string[];
    tasks: QuickStartTask[];
  };
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

export type PodSpec = {
  affinity?: PodAffinity;
  enableServiceLinks?: boolean;
  containers: PodContainer[];
  initContainers?: PodContainer[];
  volumes?: Volume[];
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
};

export type NotebookKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations & NotebookAnnotations;
    name: string;
    namespace: string;
    labels?: Partial<{
      'opendatahub.io/user': string; // translated username -- see translateUsername
    }>;
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
  };
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

export type PodContainerStatus = {
  name: string;
  ready: boolean;
  state?: {
    running?: boolean | undefined;
    waiting?: boolean | undefined;
    terminated?: boolean | undefined;
  };
};

export type ProjectKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        'openshift.io/requester': string; // the username of the user that requested this project
      }>;
    labels?: Partial<DashboardLabels> & Partial<ModelServingProjectLabels>;
    name: string;
  };
  status?: {
    phase: 'Active' | 'Terminating';
  };
};

export type ServiceAccountKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations;
    name: string;
    namespace: string;
  };
  secrets?: {
    name: string;
  }[];
};

export type ServingContainer = {
  name: string;
  args?: string[];
  image?: string;
  affinity?: PodAffinity;
  resources?: ContainerResources;
  volumeMounts?: VolumeMount[];
  env?: {
    name: string;
    value?: string;
    valueFrom?: {
      secretKeyRef?: {
        name: string;
        key: string;
      };
    };
  }[];
};

export type ServingRuntimeKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations & ServingRuntimeAnnotations;
    name: string;
    namespace: string;
  };
  spec: {
    builtInAdapter?: {
      serverType?: string;
      runtimeManagementPort?: number;
      memBufferBytes?: number;
      modelLoadingTimeoutMillis?: number;
    };
    containers: ServingContainer[];
    supportedModelFormats?: SupportedModelFormats[];
    replicas?: number;
    tolerations?: Toleration[];
    nodeSelector?: NodeSelector;
    volumes?: Volume[];
    imagePullSecrets?: ImagePullSecret[];
  };
};

export type SupportedModelFormats = {
  name: string;
  version?: string;
  autoSelect?: boolean;
};

export enum DeploymentMode {
  RawDeployment = 'RawDeployment',
}

export type InferenceServiceAnnotations = DisplayNameAnnotations &
  Partial<{
    'security.opendatahub.io/enable-auth': string;
    'serving.kserve.io/deploymentMode': DeploymentMode;
    'serving.knative.openshift.io/enablePassthrough': 'true';
    'sidecar.istio.io/inject': 'true';
    'sidecar.istio.io/rewriteAppHTTPProbers': 'true';
    'opendatahub.io/hardware-profile-name': string;
    'opendatahub.io/hardware-profile-namespace': string;
    'opendatahub.io/hardware-profile-resource-version': string;
  }>;

export type InferenceServiceLabels = Partial<{
  'networking.knative.dev/visibility': string;
  'networking.kserve.io/visibility': 'exposed';
}>;

export type ImagePullSecret = {
  name: string;
};

export type InferenceServiceKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: InferenceServiceAnnotations;
    labels?: InferenceServiceLabels;
  };
  spec: {
    predictor: {
      annotations?: Record<string, string>;
      tolerations?: Toleration[];
      nodeSelector?: NodeSelector;
      model?: {
        modelFormat?: {
          name: string;
          version?: string;
        };
        resources?: ContainerResources;
        runtime?: string;
        storageUri?: string;
        storage?: {
          key?: string;
          parameters?: Record<string, string>;
          path?: string;
          schemaPath?: string;
        };
        args?: ServingContainer['args'];
        env?: ServingContainer['env'];
      };
      maxReplicas?: number;
      minReplicas?: number;
      imagePullSecrets?: ImagePullSecret[];
    };
  };
  status?: {
    components?: {
      predictor?: {
        grpcUrl?: string;
        restUrl?: string;
        url?: string;
      };
    };
    conditions?: {
      lastTransitionTime?: string;
      status: string;
      type: string;
    }[];
    modelStatus?: {
      copies?: {
        failedCopies?: number;
        totalCopies?: number;
      };
      lastFailureInfo?: {
        location?: string;
        message?: string;
        modelRevisionName?: string;
        reason?: string;
        time?: string;
      };
      states?: {
        activeModelState: string;
        targetModelState?: string;
      };
      transitionStatus: string;
    };
    url: string;
    address?: {
      CACerts?: string;
      audience?: string;
      name?: string;
      url?: string;
    };
  };
};

export const isInferenceServiceKind = (obj: K8sResourceCommon): obj is InferenceServiceKind =>
  obj.kind === 'InferenceService';

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

export type RoleKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  rules: ResourceRule[];
};

export type RoleBindingKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  subjects: RoleBindingSubject[];
  roleRef: RoleBindingRoleRef;
};

export type RouteKind = K8sResourceCommon & {
  spec: {
    host: string;
    path: string;
    port: {
      targetPort: string;
    };
    to?: {
      kind: string;
      name: string;
      weight: number;
    };
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

export type AWSSecretKind = SecretKind & {
  metadata: {
    annotations?: DisplayNameAnnotations;
    labels?: {
      [KnownLabels.DATA_CONNECTION_AWS]: 'true';
    };
  };
  data: Record<AwsKeys, string>;
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

export type DSPipelineExternalStorageKind = {
  bucket: string;
  host: string;
  port?: '';
  scheme: string;
  region: string;
  s3CredentialsSecret: {
    accessKey: string;
    secretKey: string;
    secretName: string;
  };
};

export type DSPipelineManagedPipelinesKind = {
  instructLab?: {
    state: 'Removed' | 'Managed';
  };
};

export enum DSPipelineAPIServerStore {
  KUBERNETES = 'kubernetes',
  DATABASE = 'database',
}

export type DSPipelineKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    dspVersion: string;
    apiServer?: Partial<{
      apiServerImage: string;
      artifactImage: string;
      artifactScriptConfigMap: Partial<{
        key: string;
        name: string;
      }>;
      enableSamplePipeline: boolean;
      cacheEnabled: boolean;
      managedPipelines?: DSPipelineManagedPipelinesKind;
      pipelineStore?: DSPipelineAPIServerStore;
    }>;
    database?: Partial<{
      externalDB: Partial<{
        host: string;
        passwordSecret: Partial<{
          key: string;
          name: string;
        }>;
        pipelineDBName: string;
        port: string;
        username: string;
      }>;
      image: string;
      mariaDB: Partial<{
        image: string;
        passwordSecret: Partial<{
          key: string;
          name: string;
        }>;
        pipelineDBName: string;
        username: string;
      }>;
    }>;
    mlpipelineUI?: {
      configMap?: string;
      image: string;
    };
    persistentAgent?: Partial<{
      image: string;
      pipelineAPIServerName: string;
    }>;
    scheduledWorkflow?: Partial<{
      image: string;
    }>;
    objectStorage: Partial<{
      externalStorage: DSPipelineExternalStorageKind;
      minio: Partial<{
        bucket: string;
        image: string;
        s3CredentialsSecret: Partial<{
          accessKey: string;
          secretKey: string;
          secretName: string;
        }>;
      }>;
    }>;
    viewerCRD?: Partial<{
      image: string;
    }>;
  };
  status?: {
    conditions?: K8sCondition[];
  };
};

type ClusterQueueFlavorUsage = {
  name: string;
  resources: {
    name: ContainerResourceAttributes;
    borrowed?: string | number;
    total?: string | number;
  }[];
};

// https://kueue.sigs.k8s.io/docs/reference/kueue.v1beta1/#kueue-x-k8s-io-v1beta1-ClusterQueue
export type ClusterQueueKind = K8sResourceCommon & {
  apiVersion: 'kueue.x-k8s.io/v1beta1';
  kind: 'ClusterQueue';
  spec: {
    admissionChecks?: string[];
    cohort?: string;
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
          nominalQuota: string | number; // e.g. 9 for cpu/pods, "36Gi" for memory
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

// https://kueue.sigs.k8s.io/docs/reference/kueue.v1beta1/#kueue-x-k8s-io-v1beta1-LocalQueue
export type LocalQueueKind = K8sResourceCommon & {
  apiVersion: 'kueue.x-k8s.io/v1beta1';
  kind: 'LocalQueue';
  spec: {
    clusterQueue: string;
  };
  status?: {
    flavorsReservation?: LocalQueueFlavorUsage[];
    flavorUsage?: LocalQueueFlavorUsage[];
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
        [key: string]: unknown; // Lots of storage types with various properties in here, add later from CRD if needed
      }[];
    };
  };
};

export enum WorkloadOwnerType {
  RayCluster = 'RayCluster',
  Job = 'Job',
}

// https://kueue.sigs.k8s.io/docs/reference/kueue.v1beta1/#kueue-x-k8s-io-v1beta1-Workload
export type WorkloadKind = K8sResourceCommon & {
  apiVersion: 'kueue.x-k8s.io/v1beta1';
  kind: 'Workload';
  spec: {
    active?: boolean;
    podSets: WorkloadPodSet[];
    priority?: number;
    priorityClassName?: string;
    priorityClassSource?:
      | 'kueue.x-k8s.io/workloadpriorityclass'
      | 'scheduling.k8s.io/priorityclass';
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

export type WorkloadCondition = {
  lastTransitionTime: string;
  message: string;
  observedGeneration?: number;
  reason: string;
  status: 'True' | 'False' | 'Unknown';
  type: 'QuotaReserved' | 'Admitted' | 'PodsReady' | 'Finished' | 'Evicted' | 'Failed';
};

export type WorkloadPriorityClassKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace?: string;
  };
  value: number;
  description?: string;
};

export type AccessReviewResourceAttributes = {
  /** CRD group, '*' for all groups, omit for core resources */
  group?: '*' | string;
  /** Plural resource name, omit for all */
  resource?: string;
  /** TODO: Not a full list, could be expanded, "" means none */
  subresource?: '' | 'spec' | 'status';
  /** Must provide the verb you are trying to do; '*' means all verbs */
  verb: '*' | K8sVerb;
  /** A resource name, omit when not interested in a specific resource */
  name?: string;
  /** The namespace the check is in, omit for unbounded check */
  namespace?: string;
};

export type SelfSubjectAccessReviewKind = K8sResourceCommon & {
  spec: {
    resourceAttributes?: AccessReviewResourceAttributes;
  };
  status?: {
    allowed: boolean;
    denied?: boolean;
    reason?: string;
    evaluationError?: string;
  };
};

export type ResourceRule = {
  verbs: string[];
  apiGroups?: string[];
  resourceNames?: string[];
  resources?: string[];
};

export type SelfSubjectRulesReviewKind = K8sResourceCommon & {
  spec: {
    namespace: string;
  };
  status?: {
    incomplete: boolean;
    nonResourceRules: {
      verbs: string[];
      nonResourceURLs?: string[];
    }[];
    resourceRules: ResourceRule[];
    evaluationError?: string;
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
      'opendatahub.io/user': string;
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

export type UserKind = K8sResourceCommon & {
  metadata: {
    name: string;
  };
  groups: string[];
  fullName?: string;
};

export type GroupKind = K8sResourceCommon & {
  metadata: {
    name: string;
  };
  users: string[];
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

export type TemplateParameter = {
  name: string;
  displayName: string;
  description: string;
  value: string;
  required: boolean;
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
  disableModelMesh: boolean;
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
  disableModelTraining: boolean;
  disableFeatureStore?: boolean;
  genAiStudio?: boolean;
  modelAsService?: boolean;
};

// [1] Intentionally disjointed fields from the CRD in this type definition
// but still present in the CRD until we upgrade the CRD version.
export type DashboardConfigKind = K8sResourceCommon & {
  spec: {
    dashboardConfig: DashboardCommonConfig;
    // Intentionally disjointed from the CRD [1]
    // groupsConfig?: {
    notebookSizes?: NotebookSize[];
    modelServerSizes?: ModelServingSize[];
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
  };
};

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

export type LMEvalKind = K8sResourceCommon & {
  metadata: {
    annotations?: Partial<{
      'opendatahub.io/display-name': string;
    }>;
    name: string;
    namespace: string;
  };
  spec: {
    allowCodeExecution?: boolean;
    allowOnline?: boolean;
    batchSize?: string;
    logSamples?: boolean;
    model: string;
    modelArgs?: { name: string; value: string }[];
    timeout?: number;
    taskList: {
      taskNames: string[];
    };
  };
  status?: {
    completeTime?: string;
    lastScheduleTime?: string;
    message?: string;
    podName?: string;
    reason?: string;
    results?: string;
    state?: string;
    progressBars?: {
      count: string;
      elapsedTime: string;
      message: string;
      percent: string;
      remainingTimeEstimate: string;
    }[];
  };
};

export enum HardwareProfileFeatureVisibility {
  WORKBENCH = 'workbench',
  MODEL_SERVING = 'model-serving',
}

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

// In the SDK TResource extends from K8sResourceCommon, but both kind and apiVersion are mandatory
export type K8sResourceListResult<TResource extends Partial<K8sResourceCommon>> = {
  apiVersion: string;
  kind: string;
  items: TResource[];
  metadata: {
    resourceVersion: string;
    continue: string;
  };
};

export type ManagementState = 'Managed' | 'Unmanaged' | 'Removed';

/** Represents a component in the DataScienceCluster. */
export type DataScienceClusterComponent = {
  /**
   * The management state of the component (e.g., Managed, Removed).
   * Indicates whether the component is being actively managed or not.
   */
  managementState?: ManagementState;
};

/** Defines a DataScienceCluster with various components. */
export type DataScienceClusterKind = K8sResourceCommon & {
  metadata: {
    name: string;
  };
  spec: {
    components?: {
      [key in DataScienceStackComponent]?: DataScienceClusterComponent;
    } & {
      /** KServe and ModelRegistry components, including further specific configuration. */
      [DataScienceStackComponent.K_SERVE]?: DataScienceClusterComponent & {
        nim: {
          managementState: string;
        };
        serving: {
          ingressGateway: {
            certificate: {
              type: string;
            };
          };
          managementState: string;
          name: string;
        };
      };
      [DataScienceStackComponent.MODEL_REGISTRY]?: DataScienceClusterComponent & {
        registriesNamespace: string;
      };
      [DataScienceStackComponent.KUEUE]?: DataScienceClusterComponent & {
        defaultLocalQueueName: string;
        defaultClusterQueueName: string;
      };
    };
  };
  status?: DataScienceClusterKindStatus;
};

/** Represents the status of a component in the DataScienceCluster. */
export type DataScienceClusterComponentStatus = {
  /**
   * The management state of the component (e.g., Managed, Removed).
   * Indicates whether the component is being actively managed or not.
   */
  managementState?: ManagementState;

  /**
   * List of releases for the component.
   * Each release includes the name, the URL of the repository, and the version number.
   */
  releases?: Array<{
    name: string; // Name of the release (e.g., "Kubeflow Pipelines")
    repoUrl?: string; // URL of the repository hosting the release (e.g., GitHub URL)
    version?: string; // Version of the release (e.g., "2.2.0")
  }>;
};

/** We don't need or should ever get the full kind, this is the status section */
export type DataScienceClusterKindStatus = {
  /**
   * Status information for individual components within the cluster.
   *
   * This field maps each component of the Data Science Cluster to its corresponding status.
   * The majority of components use `DataScienceClusterComponentStatus`, which includes
   * management state and release details. However, some components require additional
   * specialized fields, such as `modelregistry` and `workbenches`.
   */
  components?: {
    [key in DataScienceStackComponent]?: DataScienceClusterComponentStatus;
  } & {
    /** Status of Model Registry, including its namespace configuration. */
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

export type ModelRegistryKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations;
  };
  spec: {
    grpc: Record<string, never>; // Empty object at create time, properties here aren't used by the UI
    rest: Record<string, never>; // Empty object at create time, properties here aren't used by the UI
    kubeRBACProxy: Record<string, never>; // Empty object at create time, properties here aren't used by the UI
  } & EitherNotBoth<
    {
      mysql?: {
        database: string;
        host: string;
        passwordSecret?: {
          key: string;
          name: string;
        };
        port?: number;
        skipDBCreation?: boolean;
        username?: string;
      } & EitherNotBoth<
        {
          sslRootCertificateConfigMap?: {
            name: string;
            key: string;
          } | null;
        },
        {
          sslRootCertificateSecret?: {
            name: string;
            key: string;
          } | null;
        }
      >;
    },
    {
      postgres?: {
        database: string;
        host?: string;
        passwordSecret?: {
          key: string;
          name: string;
        };
        port: number;
        skipDBCreation?: boolean;
        sslMode?: string;
        username?: string;
      };
    }
  >;
  status?: {
    conditions?: K8sCondition[];
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

export type ListConfigSecretsResponse = {
  secrets: ConfigSecretItem[];
  configMaps: ConfigSecretItem[];
};

export type AuthKind = K8sResourceCommon & {
  metadata: {
    name: 'auth'; // singleton, immutable name
    namespace?: never; // Cluster resource
  };
  spec: {
    adminGroups: string[];
    allowedGroups: string[];
  };
};

export type Server = {
  env?: Record<string, never>[][];
  envFrom?: Record<string, never>[];
  grpc?: boolean;
  image?: string;
  restAPI?: boolean;
  tls?: {
    secretKeyNames: {
      tlsCrt: string;
      tlsKey: string;
    };
    secretRef: {
      name: string;
    };
  };
  volumeMounts?: Record<string, never>[];
};

export type Persistence = {
  file?: { path?: string; pvc?: Record<string, never> };
  store?: { type?: string; secretKeyName?: Record<string, never> };
};

export type Services = {
  offlineStore?: {
    persistence?: Persistence;
    server?: Server;
  };
  onlineStore?: {
    persistence?: Persistence;
    server?: Server;
  };
  registry: {
    local: {
      persistence?: Persistence;
      server?: Server;
    };
  };
  ui?: Server;
};

export type FeastProjectDir = {
  git?: {
    url: string;
    featureRepoPath: string;
    ref: string;
  };
  init?: { minimal?: boolean; template?: string };
};

export type FeatureStoreKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
  };
  spec: {
    feastProject: string;
    feastProjectDir?: FeastProjectDir;
    services: Services;
    authz?: {
      kubernetes?: {
        roles?: string[];
      };
      oidc?: {
        secretRef: {
          name: string;
        };
      };
    };
    cronJob?: Record<string, never>;
    volumes?: Record<string, never>[];
  };
  status?: {
    applied?: {
      cronJob?: {
        concurrencyPolicy: string;
        containerConfigs: {
          commands: string[];
          image: string;
        };
        schedule: string;
        startingDeadlineSeconds: number;
        suspend: boolean;
      };
      feastProject: string;
      feastProjectDir?: FeastProjectDir;
      services?: Services;
    };
    clientConfigMap?: string;
    conditions?: K8sCondition[];
    cronJob?: string;
    feastVersion?: string;
    phase?: string;
    serviceHostnames?: Record<string, string>;
  };
};
