import k8s from '@kubernetes/client-node';
import { User } from '@kubernetes/client-node/dist/config_types';
import { FastifyInstance } from 'fastify';

// Add a minimal QuickStart type here as there is no way to get types without pulling in frontend (React) modules
export declare type QuickStart = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
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
  };
};

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
