/*
 * Common types, should be kept up to date with backend types
 */

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

export type DashboardConfig = K8sResourceCommon & {
  spec: {
    dashboardConfig: DashboardCommonConfig;
    notebookSizes?: NotebookSize[];
    notebookController?: {
      enabled: boolean;
      gpuConfig?: {
        enabled: boolean;
      };
      envVarConfig?: {
        enabled: boolean;
      };
      pvcSize?: string;
    };
  };
  status?: {
    notebookControllerState?: NotebookControllerUserState[];
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
};

export type NotebookResources = {
  requests?: {
    cpu?: string;
    memory?: string;
  };
  limits: {
    cpu?: string;
    memory?: string;
  };
};

export type EnvironmentVariable = {
  name: string;
  value: string | number;
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
};

export type ClusterSettings = {
  userTrackingEnabled: boolean | null;
  pvcSize: number | string;
  cullerTimeout: number;
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
    hiddenOnExplorePage?: boolean | null;
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
    type: string;
    annotations?: { [key: string]: string };
  };
  spec: {
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

export type OdhGettingStarted = {
  appName: string;
  markdown: string;
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

export type K8sResourceCommon = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace?: string;
    uid?: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
  };
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
};

export type NotebookPort = {
  name: string;
  containerPort: number;
  protocol: string;
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
};

export type Notebook = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace?: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
  };
  spec: {
    template: {
      spec: {
        enableServiceLinks?: boolean;
        containers: NotebookContainer[];
      };
    };
  };
  status?: {
    readyReplicas: number;
  } & Record<string, unknown>;
} & K8sResourceCommon;

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
