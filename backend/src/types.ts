import k8s from '@kubernetes/client-node';
import { User } from '@kubernetes/client-node/dist/config_types';
import { FastifyInstance } from 'fastify';

export type DashboardConfig = {
  enablement: boolean;
  disableInfo: boolean;
  disableSupport: boolean;
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
    appName: string;
    version?: number;
    displayName: string;
    durationMinutes: number;
    icon: string;
    description: string;
    featureFlag?: string;
  };
};

// Properties common to (almost) all Kubernetes resources.
export type K8sResourceCommon = {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    uid?: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
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
    appDisplayName?: string; // manufactured to aid with filtering in UI resources section
    appEnabled?: boolean; // manufactured to aid with UI resources section
    provider?: string;
    description: string;
    url?: string;
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
