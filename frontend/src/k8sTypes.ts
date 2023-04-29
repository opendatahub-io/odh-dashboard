import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { PodAffinity, NotebookContainer, PodToleration, Volume, ContainerResources } from './types';

export enum KnownLabels {
  DASHBOARD_RESOURCE = 'opendatahub.io/dashboard',
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

export type K8sDSGResource = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations;
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
  'notebooks.opendatahub.io/last-image-selection': string; // the last image they selected
  'notebooks.opendatahub.io/last-size-selection': string; // the last notebook size they selected
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
};

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

export type NotebookKind = K8sResourceCommon & {
  metadata: {
    annotations: DisplayNameAnnotations & NotebookAnnotations;
    name: string;
    namespace: string;
    labels: Partial<{
      'opendatahub.io/user': string; // translated username -- see translateUsername
    }>;
  };
  spec: {
    template: {
      spec: {
        affinity?: PodAffinity;
        enableServiceLinks?: boolean;
        containers: NotebookContainer[];
        volumes?: Volume[];
        tolerations?: PodToleration[];
      };
    };
  };
  status?: {
    containerState?: {
      terminated?: { [key: string]: string };
    };
  };
};

export type PodKind = K8sResourceCommon & {
  status: {
    containerStatuses: { ready: boolean; state?: { running?: boolean } }[];
  };
};

/** Assumed Dashboard Project -- if we need more beyond that we should break this type up */
export type ProjectKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        'openshift.io/requester': string; // the username of the user that requested this project
      }>;
    labels: DashboardLabels & Partial<ModelServingProjectLabels>;
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

export type ServingRuntimeKind = K8sResourceCommon & {
  metadata: {
    annotations?: DisplayNameAnnotations &
      Partial<{
        ['enable-route']: string;
        ['enable-auth']: string;
      }>;
    name: string;
    namespace: string;
  };
  spec: {
    builtInAdapter: {
      serverType: string;
      runtimeManagementPort: number;
      memBufferBytes?: number;
      modelLoadingTimeoutMillis?: number;
    };
    containers: {
      args: string[];
      image: string;
      name: string;
      resources: ContainerResources;
    }[];
    supportedModelFormats: SupportedModelFormats[];
    replicas: number;
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

type RoleBindingSubject = {
  kind: string;
  apiGroup?: string;
  name: string;
};

export type RoleBindingKind = K8sResourceCommon & {
  subjects: RoleBindingSubject[];
  roleRef: RoleBindingSubject;
};

export type RouteKind = K8sResourceCommon & {
  spec: {
    host: string;
    path: string;
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
};

export type DSPipelineKind = K8sResourceCommon & {
  spec: Partial<{
    apiServer: Partial<{
      apiServerImage: string;
      artifactImage: string;
      artifactScriptConfigMap: Partial<{
        key: string;
        name: string;
      }>;
    }>;
    database: Partial<{
      customDB: Partial<{
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
    mlpipelineUI: Partial<{
      configMap: string;
      image: string;
    }>;
    persistentAgent: Partial<{
      image: string;
      pipelineAPIServerName: string;
    }>;
    scheduledWorkflow: Partial<{
      image: string;
    }>;
    objectStorage: Partial<{
      customStorage: Partial<{
        bucket: string;
        host: string;
        port: string;
        s3CredentialsSecret: Partial<{
          accessKey: string;
          secretKey: string;
          secretName: string;
        }>;
      }>;
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
    viewerCRD: Partial<{
      image: string;
    }>;
  }>;
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
  args: string[];
  command: string[];
  image: string;
};

type PipelineRunTaskSpecResult = {
  name: string;
  type: string;
  description?: string;
};

export type PipelineRunTaskSpec = {
  steps: PipelineRunTaskSpecStep[];
  results: PipelineRunTaskSpecResult[];
  metadata: {
    annotations: {
      /** @see PipelineRunTaskSpecDigest */
      'pipelines.kubeflow.org/component_spec_digest': string;
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

export type PipelineRunTaskRunStatusProperties = {
  conditions: K8sCondition[];
  podName: string;
  startTime: string;
  completionTime?: string;
  // TODO: Populate these
  steps?: unknown[];
  taskResults?: unknown[];
  taskSpec?: {
    steps?: unknown[];
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
