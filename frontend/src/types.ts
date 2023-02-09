/*
 * Common types, should be kept up to date with backend types
 */

import { ImageStreamKind, ImageStreamSpecTagType } from './k8sTypes';
import { EitherNotBoth } from './typeHelpers';
import { EnvironmentFromVariable } from './pages/projects/types';
import { ServingRuntimeSize } from 'pages/modelServing/screens/types';

export type PrometheusResponse = {
  data: {
    result: {
      value: [number, string];
    }[];
    resultType: string;
  };
  status: string;
};

/**
 * In some YAML configs, we'll need to stringify a number -- this type just helps show it's not
 * "any string" as a documentation touch point. Has no baring on the type checking.
 */
type NumberString = string;
export type GpuSettingString = 'autodetect' | 'hidden' | NumberString | undefined;

export type DashboardConfig = K8sResourceCommon & {
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
      notebookNamespace?: string;
      gpuSetting?: GpuSettingString;
      notebookTolerationSettings?: TolerationSettings;
    };
  };
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
};

export type NotebookControllerUserState = {
  user: string;
  lastSelectedImage: string;
  lastSelectedSize: string;
  /** Omission denotes no history */
  lastActivity?: number;
};

/**
 * OdhDashboardConfig contains gpuSetting as a string value override -- proper gpus return as numbers
 * TODO: Look to make it just number by properly parsing the value
 */
export type GPUCount = string | number;

export enum ContainerResourceAttributes {
  CPU = 'cpu',
  MEMORY = 'memory',
  NVIDIA_GPU = 'nvidia.com/gpu',
}

export type ContainerResources = {
  requests?: {
    cpu?: string;
    memory?: string;
    'nvidia.com/gpu'?: GPUCount;
  };
  limits?: {
    cpu?: string;
    memory?: string;
    'nvidia.com/gpu'?: GPUCount;
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

export type ClusterSettings = {
  userTrackingEnabled: boolean;
  pvcSize: number | string;
  cullerTimeout: number;
  notebookTolerationSettings: TolerationSettings | null;
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

export type EnvVarResource = Secret | ConfigMap;

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
    getStartedLink: string;
    getStartedMarkDown: string;
    category?: string;
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

export enum BUILD_PHASE {
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
  status: BUILD_PHASE;
  timestamp: string;
};

type K8sMetadata = {
  name: string;
  namespace?: string;
  uid?: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
};

/**
 * @deprecated -- use the SDK version -- see k8sTypes.ts
 * All references that use this are un-vetted data against existing types, should be converted over
 * to the new K8sResourceCommon from the SDK to keep everythung unified on one front.
 */
export type K8sResourceCommon = {
  apiVersion?: string;
  kind?: string;
  metadata: K8sMetadata;
};

// Minimal type for ConsoleLinks
export type ConsoleLinkKind = {
  spec: {
    text: string;
    location: string;
    href: string;
    applicationMenu: {
      section: string;
      imageURL: string;
    };
  };
} & K8sResourceCommon;

//
// Used for Telemetry
//
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analytics?: any;
    clusterID?: string;
  }
}

export type ODHSegmentKey = {
  segmentKey: string;
};

export type TrackingEventProperties = {
  name?: string;
  anonymousID?: string;
  type?: string;
  term?: string;
  GPU?: GPUCount;
  lastSelectedSize?: string;
  lastSelectedImage?: string;
  projectName?: string;
  notebookName?: string;
  lastActivity?: string;
};

export type NotebookPort = {
  name: string;
  containerPort: number;
  protocol: string;
};

export type PodToleration = {
  effect: string;
  key: string;
  operator: string;
};

export type NotebookContainer = {
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
};

export type PodAffinity = {
  nodeAffinity?: { [key: string]: unknown };
};

export type Notebook = K8sResourceCommon & {
  metadata: {
    annotations: Partial<{
      'kubeflow-resource-stopped': string | null; // datestamp of stop (if omitted, it is running)
      'notebooks.kubeflow.org/last-activity': string; // datestamp of last use
      'opendatahub.io/link': string; // redirect notebook url
      'opendatahub.io/username': string; // the untranslated username behind the notebook
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
        affinity?: PodAffinity;
        enableServiceLinks?: boolean;
        containers: NotebookContainer[];
        volumes?: Volume[];
        tolerations?: PodToleration[];
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

export type BYONImageError = {
  severity: string;
  message: string;
};

export type BYONImageStatus = 'Importing' | 'Validating' | 'Succeeded' | 'Failed';

export type BYONImage = {
  id: string;
  phase?: BYONImageStatus;
  user?: string;
  uploaded?: Date;
  error?: BYONImageError;
} & BYONImageCreateRequest &
  BYONImageUpdateRequest;

export type BYONImageCreateRequest = {
  name: string;
  url: string;
  description?: string;
  // FIXME: This shouldn't be a user defined value consumed from the request payload but should be a controlled value from an authentication middleware.
  user: string;
  software?: BYONImagePackage[];
  packages?: BYONImagePackage[];
};

export type BYONImageUpdateRequest = {
  id: string;
  name?: string;
  description?: string;
  visible?: boolean;
  software?: BYONImagePackage[];
  packages?: BYONImagePackage[];
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
  errors: { [key: string]: string };
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

export type ImageInfo = {
  name: string;
  tags: ImageTagInfo[];
  description?: string;
  url?: string;
  display_name: string;
  default?: boolean;
  order: number;
  dockerImageRepo: string;
};

export type ImageType = 'byon' | 'jupyter' | 'other';

export type PersistentVolumeClaim = K8sResourceCommon & {
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
  status?: Record<string, any>; // eslint-disable-line
};

export type PersistentVolumeClaimList = {
  apiVersion?: string;
  kind?: string;
  metadata: Record<string, unknown>;
  items: PersistentVolumeClaim[];
};

export type Volume = {
  name: string;
  emptyDir?: Record<string, any>; // eslint-disable-line
  persistentVolumeClaim?: {
    claimName: string;
  };
};

export type VolumeMount = { mountPath: string; name: string };

/**
 * @deprecated -- use K8sStatus
 * Copy from partial of V1Status that will returned by the delete CoreV1Api
 */
export type DeleteStatus = {
  apiVersion?: string;
  code?: number;
  kind?: string;
  message?: string;
  reason?: string;
  status?: string;
};

export type RoleBindingSubject = {
  kind: string;
  apiGroup: string;
  name: string;
};

export type RoleBinding = {
  subjects: RoleBindingSubject[];
  roleRef: RoleBindingSubject;
} & K8sResourceCommon;

export type ResourceGetter<T extends K8sResourceCommon> = (
  projectName: string,
  resourceName: string,
) => Promise<T>;

export type ResourceCreator<T extends K8sResourceCommon> = (resource: T) => Promise<T>;

export type ResourceReplacer<T extends K8sResourceCommon> = (resource: T) => Promise<T>;

export type ResourceDeleter = (projectName: string, resourceName: string) => Promise<DeleteStatus>;

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
  gpus: number;
  envVars: EnvVarReducedTypeKeyValues;
  state: NotebookState;
  // only used for admin calls, regular users cannot use this field
  username?: string;
};

export type UsernameMap<V> = { [username: string]: V };

export type ImageStreamAndVersion = {
  imageStream?: ImageStreamKind;
  imageVersion?: ImageStreamSpecTagType;
};

export type gpuScale = {
  availableScale: number;
  gpuNumber: number;
};

export type GPUInfo = {
  configured: boolean;
  available: number;
  autoscalers: gpuScale[];
};

export type ContextResourceData<T> = {
  data: T[];
  loaded: boolean;
  error?: Error;
  refresh: () => void;
};
