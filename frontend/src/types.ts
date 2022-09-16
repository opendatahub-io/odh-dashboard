/*
 * Common types, should be kept up to date with backend types
 */

import { EitherNotBoth } from './typeHelpers';

export type DashboardConfig = K8sResourceCommon & {
  spec: {
    dashboardConfig: DashboardCommonConfig;
    groupsConfig?: {
      adminGroups: string;
      allowedGroups: string;
    };
    notebookSizes?: NotebookSize[];
    notebookController?: {
      enabled: boolean;
      pvcSize?: string;
      notebookNamespace?: string;
      notebookTolerationSettings?: NotebookTolerationSettings;
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
};

export type NotebookControllerUserState = {
  user: string;
  lastSelectedImage: string;
  lastSelectedSize: string;
  /** Omission denotes no history */
  lastActivity?: number;
};

export type NotebookResources = {
  requests?: {
    cpu?: string;
    memory?: string;
  };
  limits?: {
    cpu?: string;
    memory?: string;
  };
};

export type EnvironmentVariable = EitherNotBoth<
  { value: string | number },
  { valueFrom: Record<string, unknown> }
> & {
  name: string;
};

export type EnvVarReducedType = {
  envVarFileName: string;
} & EnvVarReducedTypeKeyValues;

export type EnvVarReducedTypeKeyValues = {
  configMap: Record<string, string>;
  secrets: Record<string, string>;
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
export type NotebookTolerationFormSettings = NotebookTolerationSettings & {
  error?: string;
};

export type ClusterSettings = {
  userTrackingEnabled: boolean;
  pvcSize: number | string;
  cullerTimeout: number;
  notebookTolerationSettings: NotebookTolerationSettings | null;
};

export type Secret = {
  data?: Record<string, string>;
  stringData?: Record<string, string>;
  type?: string;
} & K8sResourceCommon;

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
  GPU?: number;
  lastSelectedSize?: string;
  lastSelectedImage?: string;
};

export type NotebookPort = {
  name: string;
  containerPort: number;
  protocol: string;
};

export type NotebookToleration = {
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
  ports?: NotebookPort[];
  resources?: NotebookResources;
  livenessProbe?: Record<string, unknown>;
  readinessProbe?: Record<string, unknown>;
  volumeMounts?: VolumeMount[];
};

export type NotebookAffinity = {
  nodeAffinity?: { [key: string]: unknown };
};

export type Notebook = K8sResourceCommon & {
  metadata: {
    annotations: Partial<{
      'kubeflow-resource-stopped': string; // datestamp of stop (if omitted, it is running)
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
        affinity?: NotebookAffinity;
        enableServiceLinks?: boolean;
        containers: NotebookContainer[];
        volumes?: Volume[];
        tolerations?: NotebookToleration[];
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

export type PipelineRunKind = {
  spec: {
    params: {
      name: string;
      value: string;
    }[];
    pipelineRef: {
      name: string;
    };
    workspaces?: [
      {
        name: string;
        volumeClaimTemplate: {
          spec: {
            accessModes: string[];
            resources: {
              requests: {
                storage: string;
              };
            };
          };
        };
      },
    ];
  };
} & K8sResourceCommon;

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

export type PersistentVolumeClaim = {
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

/** Copy from partial of V1Status that will returned by the delete CoreV1Api */
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

export type UsernameMap<V> = { [username: string]: V };
