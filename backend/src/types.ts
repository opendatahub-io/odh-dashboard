import k8s from '@kubernetes/client-node';
import { User } from '@kubernetes/client-node/dist/config_types';
import { FastifyInstance } from 'fastify';

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
export type K8sResourceCommon = {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    uid?: string;
    labels?: { [key: string]: string };
  };
};

export type BuildKind = {
  status: {
    phase: string;
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
    displayName: string;
    provider: string;
    description: string;
    route: string | null;
    routeNamespace: string | null;
    routeSuffix: string | null;
    serviceName: string | null;
    endpoint: string | null;
    link: string | null;
    img: string;
    docsLink: string;
    getStartedLink: string;
    category: string;
    support: string;
    quickStart: string | null;
    comingSoon: boolean | null;
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
  status: string;
  timestamp?: string;
};

export type ODHSegmentKey = {
  segmentKey: string;
};
