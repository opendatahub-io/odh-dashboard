import { K8sResourceCommon, MatchExpression } from '@openshift/dynamic-plugin-sdk-utils';
import { EitherNotBoth } from '@openshift/dynamic-plugin-sdk';
import {
  KnownLabels,
  MetadataAnnotation,
  ContainerResourceAttributes,
  DataScienceStackComponent,
} from '@odh-dashboard/k8s-core';
import type {
  DisplayNameAnnotations,
  K8sCondition,
  PodSpec,
  SupportedModelFormats,
  SecretKind,
  ContainerResources,
  NodeSelector,
  PodAffinity,
  PodContainer,
  Toleration,
  Volume,
  VolumeMount,
  HardwareProfileBindingAnnotations,
  AccessReviewResourceAttributes,
  ManagementState,
  DataScienceClusterKindStatus,
} from '@odh-dashboard/k8s-core';
import { AwsKeys } from '#~/pages/projects/dataConnections/const';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { ImageStreamStatusTagCondition, ImageStreamStatusTagItem } from './types';

// Re-export types from k8s-core that are used throughout the application
export { KnownLabels, MetadataAnnotation, ContainerResourceAttributes };
export type {
  DisplayNameAnnotations,
  K8sCondition,
  PodSpec,
  SupportedModelFormats,
  SecretKind,
  ContainerResources,
  NodeSelector,
  PodAffinity,
  PodContainer,
  Toleration,
  Volume,
  VolumeMount,
  HardwareProfileBindingAnnotations,
  AccessReviewResourceAttributes,
};

export type ModelRegistry = {
  name: string;
  displayName: string;
  description: string;
  serverAddress?: string;
};

export type AccessModeSettings = Partial<Record<AccessMode, boolean>>;

export type StorageClassConfig = {
  displayName: string;
  isEnabled: boolean;
  isDefault: boolean;
  lastModified: string;
  description?: string;
  accessModeSettings?: AccessModeSettings;
};

type StorageClassAnnotations = Partial<{
  // if true, enables any persistent volume claim (PVC) that does not specify a specific storage class to automatically be provisioned.
  // Only one, if any, StorageClass per cluster can be set as default.
  [MetadataAnnotation.StorageClassIsDefault]: 'true' | 'false';
  // the description provided by the cluster admin or Container Storage Interface (CSI) provider
  [MetadataAnnotation.K8sDescription]: string;
  [MetadataAnnotation.OdhStorageClassConfig]: string;
}>;

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
  'opendatahub.io/user': string; // translated username -- see translateUsername
  'opendatahub.io/username': string; // the untranslated username behind the notebook
  'notebooks.opendatahub.io/last-image-selection': string; // the last image they selected
  'opendatahub.io/image-display-name': string; // the display name of the image
  'notebooks.opendatahub.io/last-image-version-git-commit-selection': string; // the build commit of the last image they selected
  'opendatahub.io/workbench-image-namespace': string | null; // namespace of the
  'opendatahub.io/connections': string | undefined; // the connections attached to the notebook
}> &
  Partial<HardwareProfileBindingAnnotations>;

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

export enum DeploymentMode {
  RawDeployment = 'RawDeployment',
}

export type InferenceServiceAnnotations = DisplayNameAnnotations &
  Partial<{
    'security.opendatahub.io/enable-auth': string;
    'security.opendatahub.io/auth-proxy-type': 'kube-rbac-proxy' | 'oauth-proxy' | string;
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
      timeout?: number;
      deploymentStrategy?: {
        type: 'RollingUpdate' | 'Recreate';
      };
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
  rules?: ResourceRule[];
};

export type ClusterRoleKind = K8sResourceCommon & {
  metadata: {
    name: string;
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

export enum DSPipelineAPIServerStore {
  KUBERNETES = 'kubernetes',
  DATABASE = 'database',
}

export enum DSPAMlflowIntegrationMode {
  DISABLED = 'DISABLED',
  AUTODETECT = 'AUTODETECT',
}

export type DSPipelineMlflowKind = {
  integrationMode?: DSPAMlflowIntegrationMode;
};

/**
 * Managed pipelines configuration.
 *
 * CURRENT (AutoML/AutoRAG pattern):
 * - The UI sends an empty object {} to enable managed pipelines.
 * - The operator injects the image and other fields.
 *
 * DEPRECATED (InstructLab pattern):
 * - instructLab.state: Legacy pattern for single InstructLab pipeline management
 * - Use the new pattern for all new implementations
 */
export type DSPipelineManagedPipelinesImageKind = {
  image?: string;
  pipelines?: Array<{ name: string }>;
};

export type DSPipelineManagedPipelinesInstructLabKind = {
  instructLab?: {
    state: 'Removed' | 'Managed';
  };
};

export type DSPipelineManagedPipelinesKind =
  | DSPipelineManagedPipelinesImageKind
  | DSPipelineManagedPipelinesInstructLabKind;

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
    mlflow?: DSPipelineMlflowKind;
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

// https://kueue.sigs.k8s.io/docs/reference/kueue.v1beta2/#kueue-x-k8s-io-v1beta2-ClusterQueue
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

// https://kueue.sigs.k8s.io/docs/reference/kueue.v1beta2/#kueue-x-k8s-io-v1beta2-LocalQueue
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
        [key: string]: unknown; // Lots of storage types with various properties in here, add later from CRD if needed
      }[];
    };
  };
};

export enum WorkloadOwnerType {
  RayCluster = 'RayCluster',
  Job = 'Job',
}

// https://kueue.sigs.k8s.io/docs/reference/kueue.v1beta2/#kueue-x-k8s-io-v1beta2-Workload
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

export type WorkloadPriorityClassKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace?: string;
  };
  value: number;
  description?: string;
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

/**
 * @deprecated -- accelerator profiles are going away; only in deprecation paths
 * used by *both* modelmesh and finetuning
 *
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
        database?: string;
        host?: string;
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
        database?: string;
        host?: string;
        passwordSecret?: {
          key: string;
          name: string;
        };
        port?: number;
        skipDBCreation?: boolean;
        generateDeployment?: boolean;
        sslMode?: string;
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
