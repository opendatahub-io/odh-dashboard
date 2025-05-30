/*
 * Common types, should be kept up to date with backend types
 */

import { K8sResourceCommon, WatchK8sResult } from '@openshift/dynamic-plugin-sdk-utils';
import { AxiosError } from 'axios';
import { EnvironmentFromVariable } from '#~/pages/projects/types';
import { FeatureFlag } from '#~/concepts/areas/types';
import { ImageStreamKind, ImageStreamSpecTagType } from './k8sTypes';
import { EitherNotBoth } from './typeHelpers';
import { NotebookPodSpecOptions } from './concepts/hardwareProfiles/useNotebookPodSpecOptionsState';
import { FetchStateObject } from './utilities/useFetch';

export type DevFeatureFlags = {
  devFeatureFlags: Record<FeatureFlag | string, boolean | undefined> | null;
  setDevFeatureFlag: (flag: FeatureFlag | string, value: boolean) => void;
  resetDevFeatureFlags: (turnOff: boolean) => void;
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
      inProgressText?: string;
    };
    featureFlag?: string;
    internalRoute?: string;
    error?: string;
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

export enum IdentifierResourceType {
  CPU = 'CPU',
  MEMORY = 'Memory',
  ACCELERATOR = 'Accelerator',
}

export type Identifier = {
  displayName: string;
  identifier: string;
  minCount: number | string;
  maxCount?: number | string;
  defaultCount: number | string;
  resourceType?: IdentifierResourceType;
};

export type NodeSelector = Record<string, string>;

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
      'notebooks.opendatahub.io/last-image-version-git-commit-selection': string; // the build commit of the last image they selected
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
        nodeSelector?: NodeSelector;
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
    optional?: boolean;
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
  currentStatus: EventStatus;
  currentEvent: string;
  currentEventReason: string;
  currentEventDescription: string;
};

export enum EventStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  ERROR = 'Error',
  INFO = 'Info',
  WARNING = 'Warning',
  SUCCESS = 'Success',
}

export enum NotebookState {
  Started = 'started',
  Stopped = 'stopped',
}

export enum ProgressionStep {
  WORKBENCH_REQUESTED = 'WORKBENCH_REQUESTED',
  POD_PROBLEM = 'POD_PROBLEM',
  POD_CREATED = 'POD_CREATED',
  POD_ASSIGNED = 'POD_ASSIGNED',
  PVC_ATTACHED = 'PVC_ATTACHED',
  INTERFACE_ADDED = 'INTERFACE_ADDED',
  PULLING_NOTEBOOK_IMAGE = 'PULLING_NOTEBOOK_IMAGE',
  NOTEBOOK_IMAGE_PULLED = 'NOTEBOOK_IMAGE_PULLED',
  NOTEBOOK_CONTAINER_CREATED = 'NOTEBOOK_CONTAINER_CREATED',
  NOTEBOOK_CONTAINER_PROBLEM = 'NOTEBOOK_CONTAINER_PROBLEM',
  NOTEBOOK_CONTAINER_STARTED = 'NOTEBOOK_CONTAINER_STARTED',
  PULLING_OAUTH = 'PULLING_OAUTH',
  OAUTH_PULLED = 'OAUTH_PULLED',
  OAUTH_CONTAINER_CREATED = 'OAUTH_CONTAINER_CREATED',
  OAUTH_CONTAINER_PROBLEM = 'OAUTH_CONTAINER_PROBLEM',
  OAUTH_CONTAINER_STARTED = 'OAUTH_CONTAINER_STARTED',
  WORKBENCH_STARTED = 'WORKBENCH_STARTED',
}

export const ProgressionStepTitles: Record<ProgressionStep, string> = {
  [ProgressionStep.WORKBENCH_REQUESTED]: 'Workbench requested',
  [ProgressionStep.POD_PROBLEM]: 'There was a problem with the pod',
  [ProgressionStep.POD_CREATED]: 'Pod created',
  [ProgressionStep.POD_ASSIGNED]: 'Pod assigned',
  [ProgressionStep.PVC_ATTACHED]: 'PVC attached',
  [ProgressionStep.INTERFACE_ADDED]: 'Interface added',
  [ProgressionStep.PULLING_NOTEBOOK_IMAGE]: 'Pulling workbench image',
  [ProgressionStep.NOTEBOOK_IMAGE_PULLED]: 'Workbench image pulled',
  [ProgressionStep.NOTEBOOK_CONTAINER_CREATED]: 'Workbench container created',
  [ProgressionStep.NOTEBOOK_CONTAINER_PROBLEM]: 'There was a problem with the notebook',
  [ProgressionStep.NOTEBOOK_CONTAINER_STARTED]: 'Workbench container started',
  [ProgressionStep.PULLING_OAUTH]: 'Pulling oauth proxy',
  [ProgressionStep.OAUTH_PULLED]: 'Oauth proxy pulled',
  [ProgressionStep.OAUTH_CONTAINER_CREATED]: 'Oauth proxy container created',
  [ProgressionStep.OAUTH_CONTAINER_PROBLEM]: 'There was a problem with Oauth',
  [ProgressionStep.OAUTH_CONTAINER_STARTED]: 'Oauth proxy container started',
  [ProgressionStep.WORKBENCH_STARTED]: 'Workbench started',
};

export const AssociatedSteps: { [key in ProgressionStep]?: ProgressionStep[] } = {
  [ProgressionStep.NOTEBOOK_CONTAINER_STARTED]: [
    ProgressionStep.INTERFACE_ADDED,
    ProgressionStep.PULLING_NOTEBOOK_IMAGE,
    ProgressionStep.NOTEBOOK_IMAGE_PULLED,
  ],
  [ProgressionStep.OAUTH_CONTAINER_STARTED]: [
    ProgressionStep.PULLING_OAUTH,
    ProgressionStep.OAUTH_PULLED,
    ProgressionStep.OAUTH_CONTAINER_CREATED,
  ],
  [ProgressionStep.POD_ASSIGNED]: [ProgressionStep.POD_CREATED],
  [ProgressionStep.WORKBENCH_STARTED]: Object.values(ProgressionStep),
};

export const OptionalSteps: ProgressionStep[] = [
  ProgressionStep.POD_PROBLEM,
  ProgressionStep.NOTEBOOK_CONTAINER_PROBLEM,
  ProgressionStep.OAUTH_CONTAINER_PROBLEM,
  ProgressionStep.PVC_ATTACHED,
];

export type NotebookProgressStep = {
  step: ProgressionStep;
  description?: string;
  status: EventStatus;
  timestamp: number;
};

export type NotebookData = {
  imageName: string;
  imageTagName: string;
  podSpecOptions: NotebookPodSpecOptions;
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

export type PendingContextResourceData<T> = FetchStateObject<T[], Error | AxiosError> & {
  pending: boolean;
};

export type ListWithNonDashboardPresence<T> = {
  items: T[];
  hasNonDashboardItems: boolean;
};

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

export enum VariablesValidationStatus {
  UNKNOWN = 'Unknown',
  FAILED = 'False',
  SUCCESS = 'True',
}

export type IntegrationAppStatus = {
  isInstalled: boolean;
  isEnabled: boolean;
  canInstall: boolean;
  variablesValidationStatus?: VariablesValidationStatus;
  variablesValidationTimestamp?: string;
  error: string;
};

export enum OdhPlatformType {
  // eslint-disable-next-line no-restricted-syntax
  OPEN_DATA_HUB = 'Open Data Hub',
  SELF_MANAGED_RHOAI = 'OpenShift AI Self-Managed',
  MANAGED_RHOAI = 'OpenShift AI Cloud Service',
} // Reference: https://github.com/red-hat-data-services/rhods-operator/blob/main/pkg/cluster/const.go

export type TypedPromiseRejectedResult<R> = Omit<PromiseRejectedResult, 'reason'> & { reason: R };
