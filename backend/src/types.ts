import k8s from '@kubernetes/client-node';
import { User } from '@kubernetes/client-node/dist/config_types';
import { FastifyInstance } from 'fastify';

export type DashboardConfig = {
  enablement: boolean;
  disableInfo: boolean;
  disableSupport: boolean;
};

export type ClusterSettings = {
  pvcSize: number;
  cullerTimeout: number;
}

// Add a minimal QuickStart type here as there is no way to get types without pulling in frontend (React) modules
export declare type QuickStart = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    annotations?: { [key: string]: string };
  };
  spec: {
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
}

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
    href?: string;
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
  isAdmin: boolean;
};

export type KubeDecorator = KubeStatus & {
  config: k8s.KubeConfig;
  coreV1Api: k8s.CoreV1Api;
  batchV1beta1Api: k8s.BatchV1beta1Api;
  batchV1Api: k8s.BatchV1Api;
  customObjectsApi: k8s.CustomObjectsApi;
};

export type KubeFastifyInstance = FastifyInstance & {
  kube?: KubeDecorator;
};

/*
 * Common types, should be kept up to date with frontend types
 */

export type OdhApplication = {
  metadata: {
    name: string;
    annotations?: { [key: string]: string };
  };
  spec: {
    displayName: string;
    provider: string;
    description: string;
    route: string | null;
    routeNamespace: string | null;
    routeSuffix: string | null;
    serviceName: string | null;
    consoleLink: string | null;
    endpoint: string | null;
    link: string | null;
    img: string;
    docsLink: string;
    getStartedLink: string;
    category: string;
    support: string;
    quickStart: string | null;
    comingSoon: boolean | null;
    beta?: boolean | null;
    betaTitle?: string | null;
    betaText?: string | null;
    shownOnEnabledPage: boolean | null;
    isEnabled: boolean | null;
    kfdefApplications: string[];
    csvName: string;
    enable?: {
      title: string;
      actionLabel: string;
      linkPreface?: string;
      link?: string;
      description?: string;
      variables?: { [key: string]: string };
      variableDisplayText?: { [key: string]: string };
      variableHelpText?: { [key: string]: string };
      validationSecret: string;
      validationJob: string;
      validationConfigMap?: string;
    };
    enableCR: {
      group: string;
      version: string;
      plural: string;
      name: string;
      namespace?: string;
      field?: string;
      value?: string;
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

export type BuildStatus = {
  name: string;
  status: BUILD_PHASE;
  timestamp?: string;
};

export type NotebookError = {
  severity: string;
  message: string;
}

export type NotebookStatus = "Importing" | "Validating" | "Succeeded" | "Failed";

export type Notebook = {
  id: string;
  phase?: NotebookStatus;
  user?: string;
  uploaded?: Date;
  error?: NotebookError;
  software?: NotebookPackage[];
} & NotebookCreateRequest & NotebookUpdateRequest;

export type NotebookCreateRequest = {
  name: string;
  url: string;
  description?: string;
  // FIXME: This shouldn't be a user defined value consumed from the request payload but should be a controlled value from an authentication middleware.
  user: string;
}

export type NotebookUpdateRequest = {
  id: string;
  name?: string;
  description?: string;
  visible?: boolean;
  packages?: NotebookPackage[];
}

export type NotebookPackage = {
  name: string;
  version: string;
  visible: boolean;
}


export type ImageStreamTagSpec = {
  name: string;
  annotations?: { [key: string]: string };
  from?: {
    kind: string;
    name: string;
  }
}
export type ImageStreamKind = {
  spec?: {
    tags: ImageStreamTagSpec[];
  }
  status?: any
} & K8sResourceCommon;

export type ImageStreamListKind = {
  items: ImageStreamKind[];
} & K8sResourceBase;

export type PipelineRunKind = {
  spec: {
    params: {
      name: string;
      value: string;
    }[]
    pipelineRef: {
      name: string;
    }
    workspaces?: [
      {
        name: string
        volumeClaimTemplate: {
          spec: {
            accessModes: string[]
            resources: {
              requests: {
                storage: string
              }
            }
          }
        }
      }
    ]
  }
} & K8sResourceCommon;

export type PipelineRunListKind = {
  items: PipelineRunKind[];
} & K8sResourceBase;
