/*
 * Common types, should be kept up to date with backend types
 */

import { K8sResourceCommon, WatchK8sResult } from '@openshift/dynamic-plugin-sdk-utils';
import { AxiosError } from 'axios';
import { EnvironmentFromVariable } from '~/pages/projects/types';
import {
  AcceleratorProfileKind,
  DashboardCommonConfig,
  ImageStreamKind,
  ImageStreamSpecTagType,
} from './k8sTypes';
import { EitherNotBoth } from './typeHelpers';

export type DevFeatureFlags = {
  devFeatureFlags: Partial<DashboardCommonConfig> | null;
  setDevFeatureFlag: (flag: keyof DashboardCommonConfig, value: boolean) => void;
  resetDevFeatureFlags: () => void;
  setDevFeatureFlagQueryVisible: (visible: boolean) => void;
};

export type PrometheusQueryResponse<TResultExtraProps extends object = object> = {
  data: {
    result: ({
      value: [number, string];
    } & TResultExtraProps)[];
    resultType: string;
  };
  status: string;
};

export type PrometheusQueryRangeResponseDataResult = {
  metric: {
    request?: string;
    pod?: string;
  };
  values: PrometheusQueryRangeResultValue[];
};
export type PrometheusQueryRangeResponseData = {
  result?: PrometheusQueryRangeResponseDataResult[];
  resultType: string;
};
export type PrometheusQueryRangeResponse = {
  data: PrometheusQueryRangeResponseData;
  status: string;
};

export type PrometheusQueryRangeResultValue = [number, string];

export type NotebookControllerUserState = {
  user: string;
  lastSelectedImage: string;
  lastSelectedSize: string;
  /** Omission denotes no history */
  lastActivity?: number;
};

export enum ContainerResourceAttributes {
  CPU = 'cpu',
  MEMORY = 'memory',
}

export type ContainerResources = {
  requests?: {
    [key: string]: number | string | undefined;
    cpu?: string | number;
    memory?: string;
  };
  limits?: {
    [key: string]: number | string | undefined;
    cpu?: string | number;
    memory?: string;
  };
};

export type EnvironmentVariable = EitherNotBoth<
  { value: string | number },
  { valueFrom: Record<string, unknown> }
> & {
  name: string;
};

export type EnvVarReducedTypeKeyValues = {
  configMap: Record<string, string>;
  secrets: Record<string, string>;
};

export type NotebookSize = {
  name: string;
  resources: ContainerResources;
  notUserDefined?: boolean;
};

export type TolerationSettings = {
  enabled: boolean;
  key: string;
};
export type NotebookTolerationFormSettings = TolerationSettings & {
  error?: string;
};

export type ClusterSettingsType = {
  userTrackingEnabled: boolean;
  pvcSize: number;
  cullerTimeout: number;
  notebookTolerationSettings: TolerationSettings | null;
  modelServingPlatformEnabled: ModelServingPlatformEnabled;
};

export type ModelServingPlatformEnabled = {
  kServe: boolean;
  modelMesh: boolean;
};

/** @deprecated -- use SDK type */
export type Secret = {
  data?: Record<string, string>;
  stringData?: Record<string, string>;
  type?: string;
} & K8sResourceCommon;

/** @deprecated -- use SDK type */
export type ConfigMap = {
  data?: Record<string, string>;
} & K8sResourceCommon;

export enum EnvVarResourceType {
  Secret = 'Secret',
  ConfigMap = 'ConfigMap',
}

export type OdhApplication = {
  metadata: {
    name: string;
    annotations?: { [key: string]: string };
  };
  spec: {
    displayName: string;
    provider: string;
    description: string;
    route?: string | null;
    routeNamespace?: string | null;
    routeSuffix?: string | null;
    serviceName?: string | null;
    endpoint?: string | null;
    link?: string | null;
    img: string;
    docsLink: string;
    hidden?: boolean | null;
    getStartedLink: string;
    getStartedMarkDown: string;
    category?: OdhApplicationCategory | string; // unbound by the CRD today -- should be the enum;
    support?: string;
    quickStart: string | null;
    comingSoon?: boolean | null;
    beta?: boolean | null;
    betaTitle?: string | null;
    betaText?: string | null;
    shownOnEnabledPage: boolean | null;
    isEnabled: boolean | null;
    kfdefApplications?: string[];
    csvName?: string;
    enable?: {
      title: string;
      actionLabel: string;
      description?: string;
      linkPreface?: string;
      link?: string;
      variables?: { [key: string]: string };
      variableDisplayText?: { [key: string]: string };
      variableHelpText?: { [key: string]: string };
      validationSecret: string;
      validationJob: string;
      validationConfigMap?: string;
    };
    featureFlag?: string;
    internalRoute?: string;
  };
};

/**
 * An OdhApplication that uses integration api to determine status.
 * @see isIntegrationApp
 */
export type OdhIntegrationApplication = OdhApplication & {
  spec: {
    internalRoute: string; // starts with `/api/`
  };
};

export enum OdhApplicationCategory {
  RedHatManaged = 'Red Hat managed',
  PartnerManaged = 'Partner managed',
  SelfManaged = 'Self-managed',
}

export enum OdhDocumentType {
  Documentation = 'documentation',
  HowTo = 'how-to',
  QuickStart = 'quickstart',
  Tutorial = 'tutorial',
}

export type OdhDocument = {
  kind?: string;
  metadata: {
    name: string;
    annotations?: { [key: string]: string };
  };
  spec: {
    type: string;
    displayName: string;
    appName?: string;
    appDisplayName?: string; // Only set on UI side in resources section
    appEnabled?: boolean; // Only set on UI side in resources section
    appCategory?: string; // Only set on UI side in resources section
    provider?: string;
    description: string;
    url: string;
    img?: string;
    icon?: string;
    durationMinutes?: number;
    featureFlag?: string;
  };
};

export enum BuildPhase {
  none = 'Not started',
  new = 'New',
  running = 'Running',
  pending = 'Pending',
  complete = 'Complete',
  failed = 'Failed',
  cancelled = 'Cancelled',
  error = 'Error',
}

export type BuildStatus = {
  name: string;
  imageTag: string;
  status: BuildPhase;
  timestamp: string;
};

export type SubscriptionStatusData = {
  channel?: string;
  installedCSV?: string;
  installPlanRefNamespace?: string;
  lastUpdated?: string;
};

type K8sMetadata = {
  name: string;
  namespace?: string;
  uid?: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
  creationTimestamp?: string;
};

/** Used for Telemetry */
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analytics?: any;
    clusterID?: string;
  }
}

export type ApplicationAction = {
  label: string;
  href: string;
  image: React.ReactNode;
};

export type Section = {
  label?: string;
  actions: ApplicationAction[];
};

export type NotebookPort = {
  name: string;
  containerPort: number;
  protocol: string;
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

export type Identifier = {
  displayName: string;
  identifier: string;
  minCount: number | string;
  maxCount: number | string;
  defaultCount: number | string;
};

export type NodeSelector = {
  key: string;
  value: string;
};

export type PodContainer = {
  name: string;
  image: string;
  imagePullPolicy?: string;
  workingDir?: string;
  env: EnvironmentVariable[];
  envFrom?: EnvironmentFromVariable[];
  ports?: NotebookPort[];
  resources?: ContainerResources;
  livenessProbe?: Record<string, unknown>;
  readinessProbe?: Record<string, unknown>;
  volumeMounts?: VolumeMount[];
  terminationMessagePath?: string;
  terminationMessagePolicy?: string;
  securityContext?: unknown;
};

export type PodAffinity = {
  nodeAffinity?: { [key: string]: unknown };
};

export type Notebook = K8sResourceCommon & {
  metadata: {
    annotations?: Partial<{
      'kubeflow-resource-stopped': string | null; // datestamp of stop (if omitted, it is running)
      'notebooks.kubeflow.org/last-activity': string; // datestamp of last use
      'opendatahub.io/username': string; // the untranslated username behind the notebook
      'notebooks.opendatahub.io/last-image-selection': string; // the last image they selected
      'notebooks.opendatahub.io/last-size-selection': string; // the last notebook size they selected
      'opendatahub.io/accelerator-name': string | undefined;
    }>;
    labels?: Partial<{
      'opendatahub.io/user': string; // translated username -- see translateUsername
    }>;
  };
  spec: {
    template: {
      spec: {
        affinity?: PodAffinity;
        enableServiceLinks?: boolean;
        containers: PodContainer[];
        volumes?: Volume[];
        tolerations?: Toleration[];
      };
    };
  };
  status?: {
    readyReplicas: number;
  } & Record<string, unknown>;
};

export type NotebookRunningState = {
  notebook: Notebook | null;
  isRunning: boolean;
  podUID: string;
  notebookLink: string;
};

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

export type BYONImagePackage = {
  name: string;
  version: string;
  visible: boolean;
};

export type ImageTag = {
  image: ImageInfo | undefined;
  tag: ImageTagInfo | undefined;
};

export type ImageSoftwareType = {
  name: string;
  version?: string;
};

export type EnvVarCategoryType = {
  name: string;
  variables: [
    {
      name: string;
      type: string;
    },
  ];
};

export type VariableRow = {
  variableType: string;
  variables: EnvVarType[];
  errors: { [key: string]: string | undefined };
};

export type EnvVarType = {
  name: string;
  type: string;
  value: string | number;
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

export type ResponseStatus = {
  success: boolean;
  error: string;
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
  };
  spec: {
    lookupPolicy?: {
      local: boolean;
    };
    tags?: ImageStreamTag[];
  };
  status?: ImageStreamStatus;
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

export type ImageInfo = {
  name: string;
  tags: ImageTagInfo[];
  description?: string;
  url?: string;
  display_name: string;
  default?: boolean;
  order: number;
  dockerImageRepo: string;
  error?: string;
};

export type ImageType = 'byon' | 'jupyter' | 'other';

export type Volume = {
  name: string;
  emptyDir?: Record<string, unknown>;
  persistentVolumeClaim?: {
    claimName: string;
  };
  secret?: {
    secretName: string;
  };
};

export type VolumeMount = { mountPath: string; name: string };

export type ResourceGetter<T extends K8sResourceCommon> = (
  projectName: string,
  resourceName: string,
) => Promise<T>;

export type ResourceCreator<T extends K8sResourceCommon> = (resource: T) => Promise<T>;

export type K8sEvent = {
  involvedObject: {
    uid: string;
  };
  metadata: K8sMetadata;
  eventTime: string;
  lastTimestamp: string | null; // if it never starts, the value is null
  message: string;
  reason: string;
  type: 'Warning' | 'Normal';
};

export type NotebookStatus = {
  percentile: number;
  currentStatus: EventStatus;
  currentEvent: string;
  currentEventReason: string;
  currentEventDescription: string;
};

export enum EventStatus {
  IN_PROGRESS = 'In Progress',
  ERROR = 'Error',
  INFO = 'Info',
  WARNING = 'Warning',
}

export enum NotebookState {
  Started = 'started',
  Stopped = 'stopped',
}

export type NotebookData = {
  notebookSizeName: string;
  imageName: string;
  imageTagName: string;
  acceleratorProfile?: {
    acceleratorProfile: AcceleratorProfileKind;
    count: number;
  };
  envVars: EnvVarReducedTypeKeyValues;
  state: NotebookState;
  // only used for admin calls, regular users cannot use this field
  username?: string;
  storageClassName?: string;
};

export type UsernameMap<V> = { [username: string]: V };

export type ImageStreamAndVersion = {
  imageStream?: ImageStreamKind;
  imageVersion?: ImageStreamSpecTagType;
};

// This is the workaround to use K8sResourceCommon | K8sResourceCommon[] from SDK to work with utils.
export type CustomWatchK8sResult<R extends K8sResourceCommon | K8sResourceCommon[]> = [
  data: WatchK8sResult<R>[0],
  loaded: WatchK8sResult<R>[1],
  loadError: Error | undefined,
];

export type FetchStateObject<T, E = Error> = {
  data: T;
  loaded: boolean;
  error?: E;
  refresh: () => void;
};

// TODO this and useContextResourceData should probably be removed in favor of useMakeFetchObject
export type ContextResourceData<T> = FetchStateObject<T[], Error | AxiosError>;
export type PendingContextResourceData<T> = ContextResourceData<T> & { pending: boolean };

export type BreadcrumbItemType = {
  label: string;
} & EitherNotBoth<{ link: string }, { isActive: boolean }>;

export type DetectedAccelerators = {
  configured: boolean;
  available: { [key: string]: number };
  total: { [key: string]: number };
  allocated: { [key: string]: number };
};

export enum ServingRuntimePlatform {
  SINGLE = 'single',
  MULTI = 'multi',
}

export enum ServingRuntimeAPIProtocol {
  REST = 'REST',
  GRPC = 'gRPC',
}

export type KeyValuePair = {
  key: string;
  value: string;
};

export type IntegrationAppStatus = {
  isInstalled: boolean;
  isEnabled: boolean;
  canInstall: boolean;
  error: string;
};
