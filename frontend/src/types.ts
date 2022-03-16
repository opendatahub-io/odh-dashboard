/*
 * Common types, should be kept up to date with backend types
 */

export type DashboardConfig = {
  enablement: boolean;
  disableInfo: boolean;
  disableSupport: boolean;
};

export type ClusterSettings = {
  pvcSize: number;
};

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
}

export type BuildStatus = {
  name: string;
  status: BUILD_PHASE;
  timestamp: string;
};

export type ImageSoftwareType = {
  name: string;
  version?: string;
};

export type ImageTagType = {
  content?: {
    software: ImageSoftwareType[];
    dependencies: ImageSoftwareType[];
  };
  name: string;
  recommended: boolean;
  default: boolean | undefined;
  build_status: string | null;
};

export type ImageType = {
  description: string | null;
  url: string | null;
  display_name: string;
  name: string;
  order: number;
  tags?: ImageTagType[];
};

export type ImageTag = {
  image: string;
  tag: string;
};

export type SizeDescription = {
  name: string;
  resources: {
    limits: {
      cpu: number;
      memory: string;
    };
    requests: {
      cpu: number;
      memory: string;
    };
  };
  schedulable?: boolean;
};

export type EnvVarType = {
  name: string;
  type: string;
  value: string | number;
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

export enum DATA_SOURCE {
  persistentVolume = 'pv',
  databaseAccess = 'database',
}

export type Project = {
  kind: string;
  apiVersion: string;
  metadata: {
    name: string;
    creationTimestamp: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
  };
  status: {
    phase: string;
  };
};

export type ProjectList = {
  metadata: Record<string, unknown>;
  items: Project[];
};

export type Notebook = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
  };
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
};

export type NotebookList = {
  apiVersion?: string;
  kind?: string;
  metadata: Record<string, unknown>;
  items: Notebook[];
};
