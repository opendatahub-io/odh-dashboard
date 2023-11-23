import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { StackComponent } from '~/concepts/areas/types';
import {
  PodAffinity,
  PodContainer,
  PodToleration,
  Volume,
  ContainerResources,
  NotebookSize,
  GpuSettingString,
  TolerationSettings,
  ImageStreamStatusTagItem,
  ImageStreamStatusTagCondition,
  VolumeMount,
} from './types';
import { ServingRuntimeSize } from './pages/modelServing/screens/types';

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
}>;

export type NotebookAnnotations = Partial<{
  'kubeflow-resource-stopped': string | null; // datestamp of stop (if omitted, it is running),  `odh-notebook-controller-lock` is set when first creating the notebook to avoid race conditions, it's a fake stop
  'notebooks.kubeflow.org/last-activity': string; // datestamp of last use
  'opendatahub.io/link': string; // redirect notebook url
  'opendatahub.io/username': string; // the untranslated username behind the notebook
  'opendatahub.io/service-mesh': string; // Openshift Service Mesh : determines if mesh configuration should be applied
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
  lastTransitionTime?: string;
  lastHeartbeatTime?: string;
};

export type ServingRuntimeAnnotations = Partial<{
  'opendatahub.io/template-name': string;
  'opendatahub.io/template-display-name': string;
  'opendatahub.io/disable-gpu': string;
  'opendatahub.io/recommended-accelerators': string;
  'opendatahub.io/accelerator-name': string;
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
    phase: BUILD_PHASE;
    completionTimestamp?: string;
    startTimestamp?: string;
  };
};

/**
 * Contains all the phases for BuildKind -> status -> phase (excluding NONE phase)
 */
export enum BUILD_PHASE {
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

/** A status object when Kube backend can't handle a request. */
export type K8sStatus = {
  kind: string;
  apiVersion: string;
  code: number;
  message: string;
  reason: string;
  status: string;
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
  tolerations?: PodToleration[];
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
  spec: PodSpec;
  status: {
    containerStatuses: { ready: boolean; state?: { running?: boolean } }[];
  };
};

export type ProjectKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        'openshift.io/requester': string; // the username of the user that requested this project
      }>;
    labels: Partial<DashboardLabels> & Partial<ModelServingProjectLabels>;
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
  resources: ContainerResources;
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
    replicas: number;
    tolerations?: PodToleration[];
    volumes?: Volume[];
  };
};

export type SupportedModelFormats = {
  name: string;
  version?: string;
  autoSelect?: boolean;
};

export type InferenceServiceKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations &
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
      model: {
        modelFormat: {
          name: string;
          version?: string;
        };
        runtime?: string;
        storageUri?: string;
        storage?: {
          key: string;
          parameters?: Record<string, string>;
          path: string;
          schemaPath?: string;
        };
      };
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
  data: Record<AWS_KEYS, string>;
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

export type DSPipelineKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
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
      externalStorage: {
        bucket: string;
        host: string;
        port?: '';
        scheme: string;
        s3CredentialsSecret: {
          accessKey: string;
          secretKey: string;
          secretName: string;
        };
      };
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

export type PipelineRunTaskSpecDigest = {
  name: string;
  outputs: unknown[]; // TODO: detail outputs
  version: string;
};

type PipelineRunTaskSpecStep = {
  name: string;
  args?: string[];
  command: string[];
  image: string;
};

export type PipelineRunTaskSpecResult = {
  name: string;
  type: string;
  description?: string;
};

export type PipelineRunTaskVolumeMount = {
  name: string;
  mountPath: string;
};

export type PipelineRunTaskSpec = {
  steps: PipelineRunTaskSpecStep[];
  stepTemplate?: {
    volumeMounts?: PipelineRunTaskVolumeMount[];
  };
  results: PipelineRunTaskSpecResult[];
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
export type PipelineRunTaskParam = {
  name: string;
  value: string;
};

export type PipelineRunTaskWhen = {
  input: string;
  operator: string;
  values: string[];
};

export type PipelineRunTask = {
  name: string;
  taskSpec: PipelineRunTaskSpec;
  params?: PipelineRunTaskParam[];
  when?: PipelineRunTaskWhen[];
  // TODO: favour this
  runAfter?: string[];
};

export type PipelineRunPipelineSpec = {
  tasks: PipelineRunTask[];
};

export type SkippedTask = {
  name: string;
  reason: string;
  whenExpressions: PipelineRunTaskWhen;
};

export type TaskRunResults = {
  name: string;
  type: string;
  value: string;
};

export type PipelineRunTaskStatusStep = {
  volumeMounts?: PipelineRunTaskVolumeMount[];
};

export type PipelineRunTaskRunStatusProperties = {
  conditions: K8sCondition[];
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

export type PipelineRunTaskRunStatus = {
  /** The task name; pipelineSpec.tasks[].name */
  pipelineTaskName: string;
  status: PipelineRunTaskRunStatusProperties;
};

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
  disableProjects: boolean;
  disableModelServing: boolean;
  disableProjectSharing: boolean;
  disableCustomServingRuntimes: boolean;
  disablePipelines: boolean;
  disableKServe: boolean;
  disableModelMesh: boolean;
  disableAcceleratorProfiles: boolean;
  disableServiceMesh: boolean;
  disableBiasMetrics: boolean;
  disablePerformanceMetrics: boolean;
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
    modelServerSizes?: ServingRuntimeSize[];
    notebookController?: {
      enabled: boolean;
      pvcSize?: string;
      storageClassName?: string;
      notebookNamespace?: string;
      /** @deprecated - Use AcceleratorProfiles */
      gpuSetting?: GpuSettingString;
      notebookTolerationSettings?: TolerationSettings;
    };
    templateOrder?: string[];
    templateDisablement?: string[];
  };
  /**
   * TODO: Make this its own API; it's not part of the CRD
   * Faux status object -- computed by the service account
   */
  status: {
    dependencyOperators: {
      redhatOpenshiftPipelines: OperatorStatus;
    };
  };
};

export type AcceleratorKind = K8sResourceCommon & {
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
    tolerations?: PodToleration[];
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
