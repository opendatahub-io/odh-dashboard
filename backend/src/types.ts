import k8s, { V1ConfigMap, V1Secret } from '@kubernetes/client-node';
import { User } from '@kubernetes/client-node/dist/config_types';
import type { FastifyInstance, FastifyRequest, RouteGenericInterface } from 'fastify';
import { EitherNotBoth } from './typeHelpers';

export type OperatorStatus = {
  /** Operator is installed and will be cloned to the namespace on creation */
  available: boolean;
  /** Has a detection gone underway or is the available a static default */
  queriedForStatus: boolean;
};

export type DashboardConfig = K8sResourceCommon & {
  spec: {
    // Optional in CRD -- normalized when cached in ResourceWatcher
    dashboardConfig: {
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
      disableConnectionTypes: boolean;
      disableStorageClasses: boolean;
      disableNIMModelServing: boolean;
      disableAdminConnectionTypes: boolean;
      disableFineTuning: boolean;
      disableKueue: boolean;
      disableLMEval: boolean;
      disableFeatureStore: boolean;
      genAiStudio: boolean;
      modelAsService: boolean;
    };
    // Intentionally disjointed from the CRD, we should move away from this code-wise now; CRD later
    // groupsConfig?: {
    notebookSizes?: NotebookSize[];
    modelServerSizes?: ModelServerSize[];
    notebookController?: {
      enabled: boolean;
      pvcSize?: string;
      // Intentionally disjointed from the CRD, we should move away from this code-wise now; CRD later
      // notebookNamespace?: string;
      storageClassName?: string;
    };
    templateOrder?: string[];
    templateDisablement?: string[];
    hardwareProfileOrder?: string[];
  };
};

export type ModelServerSize = {
  name: string;
  resources: ModelServerResources;
};

export type ModelServerResources = {
  limits: {
    cpu: string;
    memory: string;
  };
  requests: {
    cpu: string;
    memory: string;
  };
};

export type NotebookSize = {
  name: string;
  resources: ContainerResources;
  notUserDefined?: boolean;
};

export type ClusterSettings = {
  pvcSize: number;
  cullerTimeout: number;
  userTrackingEnabled: boolean;
  modelServingPlatformEnabled: {
    kServe: boolean;
    modelMesh: boolean;
  };
};

// Add a minimal QuickStart type here as there is no way to get types without pulling in frontend (React) modules
export declare type QuickStart = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    annotations?: { [key: string]: string };
  };
  spec: {
    appName?: string;
    version?: number;
    displayName: string;
    durationMinutes: number;
    icon: string;
    description: string;
    featureFlag?: string;
  };
};

// Properties common to (almost) all Kubernetes resources.
export type K8sResourceBase = {
  apiVersion?: string;
  kind?: string;
};

export type K8sResourceCommon = {
  metadata?: {
    name?: string;
    namespace?: string;
    generateName?: string;
    uid?: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
    creationTimestamp?: Date;
  };
} & K8sResourceBase;

export type K8sNamespacedResourceCommon = {
  metadata: {
    namespace: string;
  };
} & K8sResourceCommon;

export type K8sResourceListResult<TResource extends K8sResourceCommon> = {
  apiVersion: string;
  items: TResource[];
  metadata: {
    resourceVersion: string;
    continue: string;
  };
};

/**
 * A status object when Kube backend can't handle a request.
 */
export type K8sStatus = {
  kind: string;
  apiVersion: string;
  code: number;
  message: string;
  reason: string;
  status: string;
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

export enum BuildPhase {
  none = 'Not started',
  new = 'New',
  running = 'Running',
  pending = 'Pending',
  complete = 'Complete',
  failed = 'Failed',
  cancelled = 'Cancelled',
}

export type BuildKind = {
  spec: {
    output: {
      to: {
        name: string;
      };
    };
  };
  status: {
    phase: BuildPhase;
    completionTimestamp: string;
    startTimestamp: string;
  };
} & K8sResourceCommon;

// Minimal type for routes
export type RouteKind = {
  spec: {
    host?: string;
    tls?: {
      termination: string;
    };
  };
} & K8sResourceCommon;

// Minimal type for Subscriptions
export type SubscriptionKind = {
  spec: {
    channel?: string;
  };
  status?: {
    installedCSV?: string;
    installPlanRef?: {
      namespace: string;
    };
    lastUpdated?: string;
  };
} & K8sResourceCommon;

// Minimal type for CSVs
export type CSVKind = {
  status: {
    phase?: string;
    reason?: string;
  };
} & K8sResourceCommon;

// Minimal type for ConsoleLinks
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

export type KubeStatus = {
  currentContext: string;
  currentUser: User;
  namespace: string;
  userName: string | string[];
  userID?: string;
  clusterID: string;
  clusterBranding: string;
  isAdmin: boolean;
  isAllowed: boolean;
  serverURL: string;
  isImpersonating?: boolean;
};

export type KubeDecorator = KubeStatus & {
  config: k8s.KubeConfig;
  coreV1Api: k8s.CoreV1Api;
  batchV1beta1Api: k8s.BatchV1beta1Api;
  batchV1Api: k8s.BatchV1Api;
  customObjectsApi: k8s.CustomObjectsApi;
  rbac: k8s.RbacAuthorizationV1Api;
  currentToken: string;
};

export type KubeFastifyInstance = FastifyInstance & {
  kube: KubeDecorator;
};

// TODO: constant-ize the x-forwarded header
export type OauthFastifyRequest<Data extends RouteGenericInterface = RouteGenericInterface> =
  FastifyRequest<
    {
      Headers?: {
        'x-forwarded-access-token'?: string;
        'x-auth-request-user'?: string;
        'x-auth-request-groups'?: string;
      } & Data['Headers'];
    } & Data
  >;

/*
 * Common types, should be kept up to date with frontend types
 */

export type OdhApplication = {
  metadata: {
    name: string;
    annotations?: { [key: string]: string };
  };
  spec: {
    beta?: boolean | null;
    betaText?: string | null;
    betaTitle?: string | null;
    category: string;
    comingSoon: boolean | null;
    consoleLink: string | null;
    csvName: string | null;
    description: string;
    displayName: string;
    docsLink: string;
    hidden?: boolean | null;
    internalRoute?: string;
    enable?: {
      actionLabel: string;
      description?: string;
      link?: string;
      linkPreface?: string;
      title: string;
      validationConfigMap?: string;
      validationJob: string;
      validationSecret: string;
      variableDisplayText?: { [key: string]: string };
      variableHelpText?: { [key: string]: string };
      variables?: { [key: string]: string };
      inProgressText?: string;
      warningValidation?: {
        field: string;
        validationRegex?: string;
        message: string;
      };
    };
    enableCR: {
      field?: string;
      group: string;
      name: string;
      namespace?: string;
      plural: string;
      value?: string;
      version: string;
    };
    endpoint: string | null;
    featureFlag?: string;
    getStartedLink: string;
    getStartedMarkDown: string;
    img: string;
    shownOnEnabledPage: boolean | null;
    isEnabled: boolean | null;
    link: string | null;
    provider: string;
    quickStart: string | null;
    route: string | null;
    routeNamespace: string | null;
    routeSuffix: string | null;
    serviceName: string | null;
    support: string;
  };
};

export enum OdhDocumentType {
  Documentation = 'documentation',
  HowTo = 'how-to',
  QuickStart = 'quickstart',
  Tutorial = 'tutorial',
}

export type OdhDocument = {
  metadata: {
    name: string;
    annotations?: { [key: string]: string };
  };
  spec: {
    displayName: string;
    appName?: string;
    type: string;
    provider?: string;
    description: string;
    url: string;
    img?: string;
    icon?: string;
    durationMinutes?: number;
    featureFlag?: string;
  };
};

export type BuildStatus = {
  name: string;
  status: BuildPhase;
  timestamp?: string;
};

export type NotebookPort = {
  name: string;
  containerPort: number;
  protocol: string;
};

export type VolumeMount = { mountPath: string; name: string };

type EnvFrom = {
  configMapRef?: { name: string };
  secretRef?: { name: string };
};

export type NotebookContainer = {
  name: string;
  image: string;
  imagePullPolicy?: string;
  workingDir?: string;
  envFrom?: EnvFrom[];
  env: EnvironmentVariable[];
  ports?: NotebookPort[];
  resources?: ContainerResources;
  livenessProbe?: Record<string, unknown>;
  readinessProbe?: Record<string, unknown>;
  volumeMounts?: VolumeMount[];
};

export type NotebookAffinity = {
  nodeAffinity?: { [key: string]: unknown };
};

export type Volume = {
  name: string;
  emptyDir?: Record<string, any>;
  persistentVolumeClaim?: {
    claimName: string;
  };
};

export type Notebook = K8sResourceCommon & {
  metadata: {
    annotations?: Partial<{
      'kubeflow-resource-stopped': string; // datestamp of stop (if omitted, it is running)
      'notebooks.kubeflow.org/last-activity': string; // datestamp of last use
      'opendatahub.io/username': string; // the untranslated username behind the notebook

      // TODO: Can we get this from the data in the Notebook??
      'notebooks.opendatahub.io/last-image-selection': string; // the last image they selected
      'notebooks.opendatahub.io/last-size-selection': string; // the last notebook size they selected
      'notebooks.opendatahub.io/last-image-version-git-commit-selection': string; // the build commit of the last image they selected
    }>;
    labels: Partial<{
      'opendatahub.io/user': string; // translated username -- see translateUsername
    }>;
  };
  spec: {
    template: {
      spec: {
        affinity?: NotebookAffinity;
        enableServiceLinks?: boolean;
        containers: NotebookContainer[];
        volumes?: Volume[];
        tolerations?: Toleration[];
        nodeSelector?: NodeSelector;
      };
    };
  };
  status?: {
    readyReplicas: number;
  } & Record<string, unknown>;
};

export type NotebookList = {
  apiVersion?: string;
  kind?: string;
  metadata: Record<string, unknown>;
  items: Notebook[];
} & K8sResourceCommon;

export type ODHSegmentKey = {
  segmentKey: string;
};

export type BYONImage = {
  id: string;
  // FIXME: This shouldn't be a user defined value consumed from the request payload but should be a controlled value from an authentication middleware.
  provider: string;
  imported_time: string;
  error: string;
  name: string;
  url: string;
  display_name: string;
  description: string;
  visible: boolean;
  software: BYONImagePackage[];
  packages: BYONImagePackage[];
  recommendedAcceleratorIdentifiers: string[];
};

export type ImageInfo = {
  name: string;
  tags: ImageTagInfo[];
  description?: string;
  url?: string;
  display_name?: string;
  default?: boolean;
  order?: number;
  dockerImageRepo?: string;
  error?: string;
};

export type ImageTag = {
  image: ImageInfo | undefined;
  tag: ImageTagInfo | undefined;
};

export type BYONImagePackage = {
  name: string;
  version: string;
  visible: boolean;
};

export type ImageStreamTag = {
  name: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
  from: {
    kind: string;
    name: string;
  };
};

export type ImageStreamStatusTagItem = {
  created: string;
  dockerImageReference: string;
  image: string;
  generation: number;
};

export type ImageStreamStatusTag = {
  tag: string;
  items: ImageStreamStatusTagItem[];
  conditions?: ImageStreamStatusTagCondition[];
};

export type ImageStreamStatusTagCondition = {
  type: string;
  status: string;
  reason: string;
  message: string;
};

export type ImageStreamStatus = {
  dockerImageRepository?: string;
  publicDockerImageRepository?: string;
  tags?: ImageStreamStatusTag[];
};

export type ImageStream = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
    creationTimestamp?: string;
  };
  spec: {
    lookupPolicy?: {
      local: boolean;
    };
    tags?: ImageStreamTag[];
  };
  status?: ImageStreamStatus;
} & K8sResourceCommon;

export type ImageStreamList = {
  apiVersion?: string;
  kind?: string;
  metadata: Record<string, unknown>;
  items: ImageStream[];
} & K8sResourceCommon;

export type NameVersionPair = {
  name: string;
  version: string;
};

export type TagContent = {
  software: NameVersionPair[];
  dependencies: NameVersionPair[];
};

export type ImageTagInfo = {
  name: string;
  content: TagContent;
  recommended: boolean;
  default: boolean;
};

export type ImageType = 'byon' | 'jupyter' | 'other';

export type PersistentVolumeClaimKind = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace?: string;
    annotations?: { [key: string]: string };
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
  status?: Record<string, any>;
};

export type PersistentVolumeClaimListKind = {
  apiVersion?: string;
  kind?: string;
  metadata: Record<string, unknown>;
  items: PersistentVolumeClaimKind[];
};

export type PrometheusQueryResponse = {
  data: {
    result: [
      {
        value: [number, string];
      },
    ];
    resultType: string;
  };
  status: string;
};

export type PrometheusQueryRangeResponse = {
  data: {
    result: [
      {
        // not used -- see https://prometheus.io/docs/prometheus/latest/querying/api/#range-queries for more info
        metric: unknown;
        values: [number, string][];
      },
    ];
    resultType: string;
  };
  status: string;
};

export enum QueryType {
  QUERY = 'query',
  QUERY_RANGE = 'query_range',
}

export type GroupsConfig = {
  adminGroups: GroupStatus[];
  allowedGroups: GroupStatus[];
  errorAdmin?: string;
  errorUser?: string;
};

export type GroupStatus = {
  id: number;
  name: string;
  enabled: boolean;
};

export type GroupObjResponse = {
  users: string[] | null;
};

export type GroupCustomObject = {
  kind: string;
  apiVersion: string;
  items: GroupCustomObjectItem[];
};

export type GroupCustomObjectItem = {
  metadata: GroupCustomObjectItemMetadata;
  users: string[] | null;
};

type GroupCustomObjectItemMetadata = {
  name: string;
  uid: string;
  resourceVersion: string;
  creationTimestamp: string;
};

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

export type MachineAutoscaler = {
  spec: {
    maxReplicas: number;
    minReplicas: number;
    scaleTargetRef: {
      apiversion: string;
      kind: string;
      name: string;
    };
  };
} & K8sResourceCommon;

export type MachineSet = {
  status: {
    availableReplicas: number;
    fullyLabeledReplicas: number;
    observedGeneration: number;
    readyReplicas: number;
    replicas: number;
  };
} & K8sResourceCommon;

export type MachineAutoscalerList = {
  items: MachineAutoscaler[];
} & K8sResourceCommon;

export type MachineSetList = {
  items: MachineSet[];
} & K8sResourceCommon;

export type DetectedAccelerators = {
  configured: boolean;
  available: { [key: string]: number };
  total: { [key: string]: number };
  allocated: { [key: string]: number };
};

export type EnvironmentVariable = EitherNotBoth<
  { value: string | number },
  {
    valueFrom: Record<string, unknown> & {
      configMapKeyRef?: { key: string; name: string };
      secretKeyRef?: { key: string; name: string };
    };
  }
> & {
  name: string;
};

export type ResourceGetter<T extends K8sResourceCommon> = (
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
) => Promise<T>;

export type ResourceConstructor<T extends K8sResourceCommon> = (
  namespace: string,
  name: string,
  resource: Record<string, string>,
) => T;

export type ResourceCreator<T extends K8sResourceCommon> = (
  fastify: KubeFastifyInstance,
  resource: T,
) => Promise<T>;

export type ResourceUpdater<T extends K8sResourceCommon> = (
  fastify: KubeFastifyInstance,
  resource: T,
) => Promise<T>;

export type EnvVarResource = V1Secret | V1ConfigMap;

export type EnvVarReducedTypeKeyValues = {
  configMap: Record<string, string>;
  secrets: Record<string, string>;
};

export enum EnvVarResourceType {
  Secret = 'Secret',
  ConfigMap = 'ConfigMap',
}

export enum NotebookState {
  Started = 'started',
  Stopped = 'stopped',
}

export type PodSpecOptions = {
  resources: ContainerResources;
  tolerations: Toleration[];
  nodeSelector: NodeSelector;
  affinity: PodAffinity;
  lastSizeSelection?: string;
  selectedAcceleratorProfile?: AcceleratorProfileKind;
  selectedHardwareProfile?: HardwareProfileKind;
};

export type NotebookData = {
  imageName: string;
  imageTagName: string;
  podSpecOptions: PodSpecOptions;
  envVars: EnvVarReducedTypeKeyValues;
  state: NotebookState;
  username?: string;
  storageClassName?: string;
};

export type AcceleratorProfileState = {
  acceleratorProfile: AcceleratorProfileKind;
  count: number;
};

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

export type TemplateParameter = {
  name: string;
  displayName: string;
  description: string;
  value: string;
  required: boolean;
};

export type Template = K8sResourceCommon & {
  metadata: {
    annotations?: Partial<{
      tags: string;
      iconClass?: string;
      'opendatahub.io/template-enabled': string;
    }>;
    name: string;
    namespace: string;
  };
  objects: K8sDSGResource[];
  parameters: TemplateParameter[];
};

export type TemplateList = {
  apiVersion?: string;
  kind?: string;
  metadata: Record<string, unknown>;
  items: Template[];
} & K8sResourceCommon;

export type ServingRuntimeAnnotations = Partial<{
  'opendatahub.io/template-name': string;
  'opendatahub.io/template-display-name': string;
  'opendatahub.io/disable-gpu': string;
  'enable-route': string;
  'enable-auth': string;
}>;

export type SupportedModelFormats = {
  name: string;
  version?: string;
  autoSelect?: boolean;
};

export enum ContainerResourceAttributes {
  CPU = 'cpu',
  MEMORY = 'memory',
}

export type ContainerResources = {
  requests?: {
    cpu?: string | number;
    memory?: string;
  } & Record<string, unknown>;
  limits?: {
    cpu?: string | number;
    memory?: string;
  } & Record<string, unknown>;
};

export type PodAffinity = {
  nodeAffinity?: { [key: string]: unknown };
};

export type ServingContainer = {
  name: string;
  args?: string[];
  image?: string;
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
      serverType?: string;
      runtimeManagementPort?: number;
      memBufferBytes?: number;
      modelLoadingTimeoutMillis?: number;
    };
    containers: ServingContainer[];
    supportedModelFormats?: SupportedModelFormats[];
    replicas?: number;
    tolerations?: Toleration[];
    volumes?: Volume[];
  };
};

export enum TolerationOperator {
  EXISTS = 'Exists',
  EQUAL = 'Equal',
}

export enum TolerationEffect {
  NO_SCHEDULE = 'NoSchedule',
  PREFER_NO_SCHEDULE = 'PreferNoSchedule',
  NO_EXECUTE = 'NoExecute',
}

export type Toleration = {
  key: string;
  operator?: TolerationOperator;
  value?: string;
  effect?: TolerationEffect;
  tolerationSeconds?: number;
};

export type NodeSelector = Record<string, string>;

export type HardwareProfileKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    displayName: string;
    enabled: boolean;
    description?: string;
    tolerations?: Toleration[];
    identifiers?: {
      displayName: string;
      identifier: string;
      minCount: number | string;
      maxCount: number | string;
      defaultCount: number | string;
      resourceType?: string;
    }[];
    nodeSelector?: NodeSelector;
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

export enum KnownLabels {
  DASHBOARD_RESOURCE = 'opendatahub.io/dashboard',
  PROJECT_SHARING = 'opendatahub.io/project-sharing',
  MODEL_SERVING_PROJECT = 'modelmesh-enabled',
  DATA_CONNECTION_AWS = 'opendatahub.io/managed',
  CONNECTION_TYPE = 'opendatahub.io/connection-type',
  LABEL_SELECTOR_MODEL_REGISTRY = 'component=model-registry',
  KUEUE_MANAGED = 'kueue.openshift.io/managed',
}

export type ManagementState = 'Managed' | 'Unmanaged' | 'Removed';

// Base component status shared by all components
export type DataScienceClusterComponentStatus = {
  managementState?: ManagementState;
  releases?: Array<{
    name: string;
    version?: string;
    repoUrl?: string;
  }>;
};

export type DataScienceClusterKindStatus = {
  components?: {
    [key: string]: DataScienceClusterComponentStatus;
  } & {
    /** Status of Model Registry, including its namespace configuration. */
    modelregistry?: DataScienceClusterComponentStatus & {
      registriesNamespace?: string;
    };
    workbenches?: DataScienceClusterComponentStatus & {
      workbenchNamespace?: string;
    };
  };
  conditions: K8sCondition[];
  phase?: string;
  release?: {
    name: string;
    version?: string;
  };
};

export type DataScienceClusterKind = K8sResourceCommon & {
  spec: unknown; // we should never need to look into this
  status: DataScienceClusterKindStatus;
};

export type DataScienceClusterList = {
  kind: 'DataScienceClusterList';
  items: DataScienceClusterKind[];
};

export type DataScienceClusterInitializationKindStatus = {
  conditions: K8sCondition[];
  phase?: string;
};

export type DataScienceClusterInitializationKind = K8sResourceCommon & {
  spec: unknown; // we should never need to look into this
  status: DataScienceClusterInitializationKindStatus;
};

export type DataScienceClusterInitializationList = {
  kind: 'DataScienceClusterInitializationList';
  items: DataScienceClusterInitializationKind[];
};

export type SubscriptionStatusData = {
  channel?: string;
  installedCSV?: string;
  installPlanRefNamespace?: string;
  lastUpdated?: string;
};

export type CronJobKind = {
  spec: {
    jobTemplate: {
      spec: {
        template: {
          metadata: {
            labels?: { [key: string]: string };
          };
        };
      };
    };
    suspend: boolean;
  };
} & K8sResourceCommon;

export type K8sCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string | null;
  lastTransitionTime?: string;
  lastHeartbeatTime?: string;
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

export enum DSPipelineAPIServerPipelineStore {
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
      pipelineStore?: DSPipelineAPIServerPipelineStore;
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
    components: {
      apiServer: {
        externalUrl: string;
        url: string;
      };
      mlmdProxy: {
        externalUrl: string;
        url: string;
      };
    };
  };
};

export type TrustyAIKind = K8sResourceCommon & {
  status?: {
    conditions?: K8sCondition[];
  };
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
          };
        },
        {
          sslRootCertificateSecret?: {
            name: string;
            key: string;
          };
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

export type ResponseStatus = {
  success: boolean;
  error: string;
};

export enum ServiceAddressAnnotation {
  EXTERNAL_REST = 'routing.opendatahub.io/external-address-rest',
  EXTERNAL_GRPC = 'routing.opendatahub.io/external-address-grpc',
}

export enum VariablesValidationStatus {
  UNKNOWN = 'Unknown',
  FAILED = 'False',
  SUCCESS = 'True',
}

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
    lastAccountCheck?: string;
  };
};

export type ResourceAccessReviewResponse = {
  groups?: string[];
  users?: string[];
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

export type FeatureStoreKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: Record<string, string>;
  };
  spec: {
    feastProject: string;
    services: Record<string, any>;
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
      services?: Record<string, any>;
    };
    clientConfigMap?: string;
    conditions?: K8sCondition[];
    cronJob?: string;
    feastVersion?: string;
    phase?: string;
    serviceHostnames?: Record<string, string>;
  };
};

export enum OdhPlatformType {
  OPEN_DATA_HUB = 'Open Data Hub',
  SELF_MANAGED_RHOAI = 'OpenShift AI Self-Managed',
  MANAGED_RHOAI = 'OpenShift AI Cloud Service',
} // Reference: https://github.com/red-hat-data-services/rhods-operator/blob/main/pkg/cluster/const.go
