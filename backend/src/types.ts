import k8s, { V1ConfigMap, V1Secret } from '@kubernetes/client-node';
import { User } from '@kubernetes/client-node/dist/config_types';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { RouteGenericInterface } from 'fastify/types/route';
import { EitherNotBoth } from './typeHelpers';

export type OperatorStatus = {
  /** Operator is installed and will be cloned to the namespace on creation */
  available: boolean;
  /** Has a detection gone underway or is the available a static default */
  queriedForStatus: boolean;
};

export type DashboardConfig = K8sResourceCommon & {
  spec: {
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
      disableProjectSharing: boolean;
      disableCustomServingRuntimes: boolean;
      disablePipelines: boolean;
      disableBiasMetrics: boolean;
      disablePerformanceMetrics: boolean;
      disableKServe: boolean;
      disableKServeAuth: boolean;
      disableKServeMetrics: boolean;
      disableModelMesh: boolean;
      disableAcceleratorProfiles: boolean;
      disablePipelineExperiments: boolean;
      disableDistributedWorkloads: boolean;
      disableModelRegistry: boolean;
    };
    groupsConfig?: {
      adminGroups: string;
      allowedGroups: string;
    };
    notebookSizes?: NotebookSize[];
    modelServerSizes?: ModelServerSize[];
    notebookController?: {
      enabled: boolean;
      pvcSize?: string;
      notebookNamespace?: string;
      notebookTolerationSettings?: {
        enabled: boolean;
        key: string;
      };
      storageClassName?: string;
    };
    templateOrder?: string[];
    templateDisablement?: string[];
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

export type NotebookResources = {
  requests?: {
    cpu?: string;
    memory?: string;
  } & Record<string, unknown>;
  limits?: {
    cpu?: string;
    memory?: string;
  } & Record<string, unknown>;
};

export type NotebookSize = {
  name: string;
  resources: NotebookResources;
  notUserDefined?: boolean;
};

export type NotebookTolerationSettings = {
  enabled: boolean;
  key: string;
};

export type ClusterSettings = {
  pvcSize: number;
  cullerTimeout: number;
  userTrackingEnabled: boolean;
  notebookTolerationSettings: NotebookTolerationSettings | null;
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

export enum BUILD_PHASE {
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
    phase: BUILD_PHASE;
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
  status?: {
    installedCSV?: string;
    installPlanRef?: {
      namespace: string;
    };
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

export type KfDefApplication = {
  kustomizeConfig: {
    repoRef: {
      name: string;
      path: string;
    };
  };
  name: string;
};

export type KfDefResource = K8sResourceCommon & {
  spec: {
    applications: KfDefApplication[];
  };
};

export type KubeStatus = {
  currentContext: string;
  currentUser: User;
  namespace: string;
  userName: string | string[];
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
  kube?: KubeDecorator;
};

// TODO: constant-ize the x-forwarded header
export type OauthFastifyRequest<Data extends RouteGenericInterface = RouteGenericInterface> =
  FastifyRequest<{ Headers?: { 'x-forwarded-access-token'?: string } & Data['Headers'] } & Data>;

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
    kfdefApplications: string[];
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
  status: BUILD_PHASE;
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
  resources?: NotebookResources;
  livenessProbe?: Record<string, unknown>;
  readinessProbe?: Record<string, unknown>;
  volumeMounts?: VolumeMount[];
};

export type NotebookAffinity = {
  nodeAffinity?: { [key: string]: unknown };
};

export type Volume = {
  name: string;
  emptyDir?: Record<string, any>; // eslint-disable-line
  persistentVolumeClaim?: {
    claimName: string;
  };
};

export type Notebook = K8sResourceCommon & {
  metadata: {
    annotations: Partial<{
      'kubeflow-resource-stopped': string; // datestamp of stop (if omitted, it is running)
      'notebooks.kubeflow.org/last-activity': string; // datestamp of last use
      'opendatahub.io/username': string; // the untranslated username behind the notebook

      // TODO: Can we get this from the data in the Notebook??
      'notebooks.opendatahub.io/last-image-selection': string; // the last image they selected
      'notebooks.opendatahub.io/last-size-selection': string; // the last notebook size they selected
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

export type Route = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace: string;
    annotations?: { [key: string]: string };
  };
  spec: {
    host: string;
    port: {
      targetPort: string;
    };
    tls: {
      insecureEdgeTerminationPolicy: string;
      termination: string;
    };
    to: {
      kind: string;
      name: string;
      weight: number;
    };
    wildcardPolicy: string;
  };
};

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

export type GroupsConfigBodyList = {
  adminGroups: string[];
  allowedGroups: string[];
};

export type GroupsConfigBody = {
  adminGroups: string;
  allowedGroups: string;
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

export type NotebookData = {
  notebookSizeName: string;
  imageName: string;
  imageTagName: string;
  acceleratorProfile: AcceleratorProfileState;
  envVars: EnvVarReducedTypeKeyValues;
  state: NotebookState;
  username?: string;
};

export type AcceleratorProfileState = {
  acceleratorProfile?: AcceleratorProfileKind;
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

export type ServingRuntime = K8sResourceCommon & {
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
    containers: {
      args: string[];
      image: string;
      name: string;
      resources?: ContainerResources;
      volumeMounts?: VolumeMount[];
    }[];
    supportedModelFormats: SupportedModelFormats[];
    replicas?: number;
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
}

type ComponentNames =
  | 'codeflare'
  | 'data-science-pipelines-operator'
  | 'kserve'
  | 'model-mesh'
  // Bug: https://github.com/opendatahub-io/opendatahub-operator/issues/641
  | 'odh-dashboard'
  | 'ray'
  | 'workbenches';

export type DataScienceClusterKindStatus = {
  conditions: K8sCondition[];
  installedComponents: { [key in ComponentNames]?: boolean };
  phase?: string;
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
  installedCSV?: string;
  installPlanRefNamespace?: string;
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

export type DSPipelineKind = K8sResourceCommon & {
  spec: {
    dspVersion: string;
  };
  status?: {
    conditions?: K8sCondition[];
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
