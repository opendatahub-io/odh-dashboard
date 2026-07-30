import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { EitherNotBoth } from '@odh-dashboard/foundation';
import {
  KnownLabels,
  MetadataAnnotation,
  ContainerResourceAttributes,
  DataScienceStackComponent,
  DSPAMlflowIntegrationMode,
  WorkloadOwnerType,
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
  AcceleratorProfileKind,
  ConfigMapKind,
  EventKind,
  StorageClassKind,
  NotebookAnnotations,
  NotebookKind,
  RoleBindingSubject,
  RoleBindingRoleRef,
  ResourceRule,
  RoleKind,
  RoleBindingKind,
  TrustyAIKind,
  ClusterQueueKind,
  LocalQueueKind,
  WorkloadPodSet,
  WorkloadKind,
  WorkloadConditionType,
  WorkloadCondition,
  CohortKind,
  ResourceFlavorKind,
  ServiceKind,
  NIMAccountKind,
  ConfigSecretItem,
} from '@odh-dashboard/k8s-core';
import { AwsKeys } from '#~/pages/projects/dataConnections/const';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { ImageStreamStatusTagCondition, ImageStreamStatusTagItem } from './types';

// Re-export types from k8s-core that are used throughout the application
export {
  KnownLabels,
  MetadataAnnotation,
  ContainerResourceAttributes,
  DSPAMlflowIntegrationMode,
  WorkloadOwnerType,
};
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
  ConfigMapKind,
  EventKind,
  StorageClassKind,
  NotebookAnnotations,
  NotebookKind,
  RoleBindingSubject,
  RoleBindingRoleRef,
  ResourceRule,
  RoleKind,
  RoleBindingKind,
  TrustyAIKind,
  ClusterQueueKind,
  LocalQueueKind,
  WorkloadPodSet,
  WorkloadKind,
  WorkloadConditionType,
  WorkloadCondition,
  CohortKind,
  ResourceFlavorKind,
  ServiceKind,
  NIMAccountKind,
  ConfigSecretItem,
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

// from: https://github.com/opendatahub-io/data-science-pipelines-operator/blob/9b518e02ee794d0afbe2b9ad35c85be10051ce6e/controllers/config/defaults.go#L127-L138
export enum K8sDspaConditionReason {
  MinimumReplicasAvailable = 'MinimumReplicasAvailable',
  FailingToDeploy = 'FailingToDeploy',
  ComponentDeploymentNotFound = 'ComponentDeploymentNotFound',
  UnsupportedVersion = 'UnsupportedVersion',
  Deploying = 'Deploying',
  NotApplicable = 'NotApplicable',
}

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

export type { K8sAPIOptions } from '@odh-dashboard/k8s-core';

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

export type ClusterRoleKind = K8sResourceCommon & {
  metadata: {
    name: string;
  };
  rules?: ResourceRule[];
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

export type WorkloadPriorityClassKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace?: string;
  };
  value: number;
  description?: string;
};

// https://kueue.sigs.k8s.io/docs/reference/kueue.v1beta2/#visibility-kueue-x-k8s-io-v1beta2-PendingWorkload
export type PendingWorkload = {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
  };
  priority: number;
  priorityClassName?: string;
  localQueueName: string;
  positionInClusterQueue: number;
  positionInLocalQueue: number;
};

export type PendingWorkloadsSummary = {
  items: PendingWorkload[];
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

export type { AcceleratorProfileKind };

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
