import { K8sResourceCommon, MatchExpression } from '@openshift/dynamic-plugin-sdk-utils';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import { AwsKeys } from '~/pages/projects/dataConnections/const';
import { StackComponent } from '~/concepts/areas/types';
import {
  PodAffinity,
  PodContainer,
  Toleration,
  Volume,
  ContainerResources,
  NotebookSize,
  TolerationSettings,
  ImageStreamStatusTagItem,
  ImageStreamStatusTagCondition,
  VolumeMount,
  ContainerResourceAttributes,
} from './types';
import { ModelServingSize } from './pages/modelServing/screens/types';

export enum KnownLabels {
  DASHBOARD_RESOURCE = 'opendatahub.io/dashboard',
  PROJECT_SHARING = 'opendatahub.io/project-sharing',
  MODEL_SERVING_PROJECT = 'modelmesh-enabled',
  DATA_CONNECTION_AWS = 'opendatahub.io/managed',
}

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
type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string; // the description provided by the user
  'openshift.io/display-name': string; // the name provided by the user
}>;

type StorageClassAnnotations = Partial<{
  // if true, enables any persistent volume claim (PVC) that does not specify a specific storage class to automatically be provisioned.
  // Only one, if any, StorageClass per cluster can be set as default.
  'storageclass.kubernetes.io/is-default-class': 'true' | 'false';
  // the description provided by the cluster admin or Container Storage Interface (CSI) provider
  'kubernetes.io/description': string;
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
}>;

export type NotebookAnnotations = Partial<{
  'kubeflow-resource-stopped': string | null; // datestamp of stop (if omitted, it is running),  `odh-notebook-controller-lock` is set when first creating the notebook to avoid race conditions, it's a fake stop
  'notebooks.kubeflow.org/last-activity': string; // datestamp of last use
  'opendatahub.io/username': string; // the untranslated username behind the notebook
  'notebooks.opendatahub.io/last-image-selection': string; // the last image they selected
  'notebooks.opendatahub.io/last-size-selection': string; // the last notebook size they selected
  'opendatahub.io/accelerator-name': string; // the accelerator attached to the notebook
  'opendatahub.io/image-display-name': string; // the display name of the image
}>;

export type DashboardLabels = {
  [KnownLabels.DASHBOARD_RESOURCE]: 'true';
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

export type ServingRuntimeAnnotations = Partial<{
  'opendatahub.io/template-name': string;
  'opendatahub.io/template-display-name': string;
  'opendatahub.io/disable-gpu': string;
  'opendatahub.io/recommended-accelerators': string;
  'opendatahub.io/accelerator-name': string;
  'opendatahub.io/apiProtocol': string;
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
      imageUrl: string;
    };
  };
} & K8sResourceCommon;

export type EventKind = K8sResourceCommon & {
  metadata: {
    uid?: string;
  };
  involvedObject: {
    name: string;
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
  };
  status?: {
    dockerImageRepository?: string;
    publicDockerImageRepository?: string;
    tags?: {
      tag: string;
      items: ImageStreamStatusTagItem[] | null;
      conditions?: ImageStreamStatusTagCondition[];
    }[];
  };
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
    accessModes: string[];
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
    conditions: K8sCondition[];
    containerStatuses?: {
      name?: string;
      ready: boolean;
      state?: { running?: boolean; waiting?: boolean; terminated?: boolean };
    }[];
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

export type DashboardProjectKind = ProjectKind & {
  labels: DashboardLabels & Partial<ModelServingProjectLabels>;
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
  args: string[];
  image: string;
  name: string;
  affinity?: PodAffinity;
  resources?: ContainerResources;
  volumeMounts?: VolumeMount[];
};

export type ServingRuntimeKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations & ServingRuntimeAnnotations;
    name: string;
    namespace: string;
  };
  spec: {
    builtInAdapter?: {
      serverType: string;
      runtimeManagementPort: number;
      memBufferBytes?: number;
      modelLoadingTimeoutMillis?: number;
    };
    containers: ServingContainer[];
    supportedModelFormats: SupportedModelFormats[];
    replicas?: number;
    tolerations?: Toleration[];
    volumes?: Volume[];
  };
};

export type SupportedModelFormats = {
  name: string;
  version?: string;
  autoSelect?: boolean;
};

export type InferenceServiceAnnotations = Partial<{
  'security.opendatahub.io/enable-auth': string;
}>;

export type InferenceServiceKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: InferenceServiceAnnotations &
      DisplayNameAnnotations &
      EitherOrNone<
        {
          'serving.kserve.io/deploymentMode': 'ModelMesh';
        },
        {
          'serving.knative.openshift.io/enablePassthrough': 'true';
          'sidecar.istio.io/inject': 'true';
          'sidecar.istio.io/rewriteAppHTTPProbers': 'true';
        }
      >;
  };
  spec: {
    predictor: {
      tolerations?: Toleration[];
      model: {
        modelFormat: {
          name: string;
          version?: string;
        };
        resources?: ContainerResources;
        runtime?: string;
        storageUri?: string;
        storage?: {
          key: string;
          parameters?: Record<string, string>;
          path: string;
          schemaPath?: string;
        };
      };
      maxReplicas?: number;
      minReplicas?: number;
    };
  };
  status?: {
    components: {
      predictor?: {
        grpcUrl: string;
        restUrl: string;
        url: string;
      };
    };
    conditions: {
      lastTransitionTime: string;
      status: string;
      type: string;
    }[];
    modelStatus: {
      copies: {
        failedCopies: number;
        totalCopies: number;
      };
      lastFailureInfo?: {
        location: string;
        message: string;
        modelRevisionName: string;
        reason: string;
        time: string;
      };
      states: {
        activeModelState: string;
        targetModelState: string;
      };
      transitionStatus: string;
    };
    url: string;
  };
};

export type RoleBindingSubject = {
  kind: string;
  apiGroup?: string;
  name: string;
};

export type RoleBindingKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  subjects: RoleBindingSubject[];
  roleRef: RoleBindingSubject;
};

export type RouteKind = K8sResourceCommon & {
  spec: {
    host: string;
    path: string;
    port: {
      targetPort: string;
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
    storage: {
      format: string;
      folder: string;
      size: string;
    };
    data: {
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
      imagePullSecrets?: {
        name?: string;
      }[];
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

/** @deprecated - Tekton is no longer used */
export type PipelineRunTaskSpecDigest = {
  name: string;
  outputs: unknown[]; // TODO: detail outputs
  version: string;
};

/** @deprecated - Tekton is no longer used */
type PipelineRunTaskSpecStep = {
  name: string;
  args?: string[];
  command: string[] | undefined;
  image: string;
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunTaskSpecResult = {
  name: string;
  type: string;
  description?: string;
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunTaskVolumeMount = {
  name: string;
  mountPath: string;
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunTaskSpec = {
  steps: PipelineRunTaskSpecStep[];
  stepTemplate?: {
    volumeMounts?: PipelineRunTaskVolumeMount[];
  };
  results: PipelineRunTaskSpecResult[] | undefined;
  metadata?: {
    annotations?: {
      /** @see PipelineRunTaskSpecDigest */
      'pipelines.kubeflow.org/component_spec_digest': string;
      'pipelines.kubeflow.org/task_display_name': string;
    };
    labels: {
      'pipelines.kubeflow.org/cache_enabled': 'true';
    };
  };
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunTaskParam = {
  name: string;
  value: string;
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunTaskWhen = {
  input: string;
  operator: string;
  values: string[];
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunTask = {
  name: string;
  taskSpec: PipelineRunTaskSpec;
  params?: PipelineRunTaskParam[];
  when?: PipelineRunTaskWhen[];
  // TODO: favour this
  runAfter?: string[];
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunPipelineSpec = {
  tasks: PipelineRunTask[];
};

/** @deprecated - Tekton is no longer used */
export type SkippedTask = {
  name: string;
  reason: string;
  whenExpressions: PipelineRunTaskWhen;
};

/** @deprecated - Tekton is no longer used */
export type TaskRunResults = {
  name: string;
  type: string;
  value: string;
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunTaskStatusStep = {
  volumeMounts?: PipelineRunTaskVolumeMount[];
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunTaskRunStatusProperties = {
  conditions?: K8sCondition[];
  podName: string;
  startTime: string;
  completionTime?: string;
  // TODO: Populate these
  steps?: unknown[];
  taskResults?: TaskRunResults[];
  taskSpec?: {
    steps?: PipelineRunTaskStatusStep[];
    results?: unknown[];
  };
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunTaskRunStatus = {
  /** The task name; pipelineSpec.tasks[].name */
  pipelineTaskName: string;
  status?: PipelineRunTaskRunStatusProperties;
};

/** @deprecated - Tekton is no longer used */
export type PipelineRunKind = K8sResourceCommon & {
  metadata: {
    name: string;
  };
  spec: {
    pipelineSpec?: PipelineRunPipelineSpec;
    params?: PipelineRunTaskParam[];
    /** Unsupported for Kubeflow */
    pipelineRef?: {
      name: string;
    };
  };
  status?: {
    startTime: string;
    completionTime?: string;
    succeededCondition?: string;
    conditions?: K8sCondition[];
    /** Keyed on a generated key for the task run */
    taskRuns?: Record<string, PipelineRunTaskRunStatus>;
    pipelineSpec: PipelineRunPipelineSpec;
    skippedTasks?: SkippedTask[];
    /** References Tekton tasks -- unlikely we will need this */
    childReferences: unknown[];
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
  disableProjectSharing: boolean;
  disableCustomServingRuntimes: boolean;
  disablePipelines: boolean;
  disableBiasMetrics: boolean;
  disablePerformanceMetrics: boolean;
  disableKServe: boolean;
  disableKServeAuth: boolean;
  disableModelMesh: boolean;
  disableAcceleratorProfiles: boolean;
  // TODO Temp feature flag - remove with https://issues.redhat.com/browse/RHOAIENG-3826
  disablePipelineExperiments: boolean;
  disableDistributedWorkloads: boolean;
  disableModelRegistry: boolean;
};

export type OperatorStatus = {
  /** Operator is installed and will be cloned to the namespace on creation */
  available: boolean;
  /** Has a detection gone underway or is the available a static default */
  queriedForStatus: boolean;
};

export type DashboardConfigKind = K8sResourceCommon & {
  spec: {
    dashboardConfig: DashboardCommonConfig;
    groupsConfig?: {
      adminGroups: string;
      allowedGroups: string;
    };
    notebookSizes?: NotebookSize[];
    modelServerSizes?: ModelServingSize[];
    notebookController?: {
      enabled: boolean;
      pvcSize?: string;
      storageClassName?: string;
      notebookNamespace?: string;
      notebookTolerationSettings?: TolerationSettings;
    };
    templateOrder?: string[];
    templateDisablement?: string[];
  };
};

export type AcceleratorProfileKind = K8sResourceCommon & {
  metadata: {
    name: string;
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

/** We don't need or should ever get the full kind, this is the status section */
export type DataScienceClusterKindStatus = {
  conditions: K8sCondition[];
  installedComponents: { [key in StackComponent]?: boolean };
  phase?: string;
};

export type DataScienceClusterInitializationKindStatus = {
  conditions: K8sCondition[];
  phase?: string;
};

export type ModelRegistryKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    grpc: {
      port: number;
    };
    rest: {
      port: number;
      serviceRoute: string;
    };
    mysql?: {
      database: string;
      host: string;
      port?: number;
    };
    postgres: {
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
  };
  status?: {
    conditions?: K8sCondition[];
  };
};
