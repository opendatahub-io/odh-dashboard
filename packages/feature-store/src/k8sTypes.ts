import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sCondition } from '@odh-dashboard/internal/k8sTypes';

export type FeastSecretKeyNames = {
  tlsCrt?: string;
  tlsKey?: string;
};

export type FeastTlsConfigs = {
  secretRef?: { name: string };
  secretKeyNames?: FeastSecretKeyNames;
  disable?: boolean;
};

export type FeastTlsRemoteRegistryConfigs = {
  configMapRef: { name: string };
  certName: string;
};

export type FeastWorkerConfigs = {
  workers?: number;
  workerConnections?: number;
  maxRequests?: number;
  maxRequestsJitter?: number;
  keepAliveTimeout?: number;
  registryTTLSeconds?: number;
};

export type FeastContainerConfigs = {
  image?: string;
  env?: Record<string, string>[];
  envFrom?: Record<string, unknown>[];
  imagePullPolicy?: string;
  resources?: Record<string, unknown>;
  nodeSelector?: Record<string, string>;
};

export type FeastServerConfigs = FeastContainerConfigs & {
  tls?: FeastTlsConfigs;
  logLevel?: string;
  metrics?: boolean;
  volumeMounts?: Record<string, unknown>[];
  workerConfigs?: FeastWorkerConfigs;
};

export type FeastRegistryServerConfigs = FeastServerConfigs & {
  restAPI?: boolean;
  grpc?: boolean;
};

export type FeastPvcCreate = {
  accessModes?: string[];
  storageClassName?: string;
  resources?: {
    requests?: Record<string, string>;
  };
};

export type FeastPvcConfig = {
  ref?: { name: string };
  create?: FeastPvcCreate;
  mountPath: string;
};

export type FeastOfflineStoreFilePersistence = {
  type?: string;
  pvc?: FeastPvcConfig;
};

export type FeastDBStorePersistence = {
  type: string;
  secretRef: { name: string };
  secretKeyName?: string;
};

export type FeastOfflineStorePersistence = {
  file?: FeastOfflineStoreFilePersistence;
  store?: FeastDBStorePersistence;
};

export type FeastOnlineStoreFilePersistence = {
  path?: string;
  pvc?: FeastPvcConfig;
};

export type FeastOnlineStorePersistence = {
  file?: FeastOnlineStoreFilePersistence;
  store?: FeastDBStorePersistence;
};

export type FeastRegistryFilePersistence = {
  path?: string;
  pvc?: FeastPvcConfig;
  s3_additional_kwargs?: Record<string, string>;
  cache_ttl_seconds?: number;
  cache_mode?: string;
};

export type FeastRegistryDBStorePersistence = {
  type: string;
  secretRef: { name: string };
  secretKeyName?: string;
};

export type FeastRegistryPersistence = {
  file?: FeastRegistryFilePersistence;
  store?: FeastRegistryDBStorePersistence;
};

export type FeastLocalRegistryConfig = {
  server?: FeastRegistryServerConfigs;
  persistence?: FeastRegistryPersistence;
};

export type FeastFeatureStoreRef = {
  name: string;
  namespace?: string;
};

export type FeastRemoteRegistryConfig = {
  hostname?: string;
  feastRef?: FeastFeatureStoreRef;
  tls?: FeastTlsRemoteRegistryConfigs;
};

export type FeastRegistry = {
  local?: FeastLocalRegistryConfig;
  remote?: FeastRemoteRegistryConfig;
};

export type FeastOfflineStore = {
  server?: FeastServerConfigs;
  persistence?: FeastOfflineStorePersistence;
};

export type FeastOnlineStore = {
  server?: FeastServerConfigs;
  persistence?: FeastOnlineStorePersistence;
};

export type FeastAutoscalingConfig = {
  minReplicas?: number;
  maxReplicas: number;
  metrics?: Record<string, unknown>[];
  behavior?: Record<string, unknown>;
};

export type FeastScalingConfig = {
  autoscaling?: FeastAutoscalingConfig;
};

export type FeastPDBConfig = {
  minAvailable?: number | string;
  maxUnavailable?: number | string;
};

export type FeastServices = {
  offlineStore?: FeastOfflineStore;
  onlineStore?: FeastOnlineStore;
  registry?: FeastRegistry;
  ui?: FeastServerConfigs;
  deploymentStrategy?: Record<string, unknown>;
  securityContext?: Record<string, unknown>;
  disableInitContainers?: boolean;
  runFeastApplyOnInit?: boolean;
  volumes?: Record<string, unknown>[];
  scaling?: FeastScalingConfig;
  podDisruptionBudgets?: FeastPDBConfig;
  topologySpreadConstraints?: Record<string, unknown>[];
  affinity?: Record<string, unknown>;
};

export type FeastGitCloneOptions = {
  url: string;
  ref?: string;
  configs?: Record<string, string>;
  featureRepoPath?: string;
  env?: Record<string, string>[];
  envFrom?: Record<string, unknown>[];
};

export type FeastInitOptions = {
  minimal?: boolean;
  template?: string;
};

export type FeastProjectDir = {
  git?: FeastGitCloneOptions;
  init?: FeastInitOptions;
};

export type FeastAuthzConfig = {
  kubernetes?: {
    roles?: string[];
  };
  oidc?: {
    secretRef: { name: string };
  };
};

export type FeastCronJobContainerConfigs = FeastContainerConfigs & {
  commands?: string[];
};

export type FeastJobSpec = {
  podTemplateAnnotations?: Record<string, string>;
  parallelism?: number;
  completions?: number;
  activeDeadlineSeconds?: number;
  backoffLimit?: number;
  ttlSecondsAfterFinished?: number;
  suspend?: boolean;
};

export type FeastCronJob = {
  annotations?: Record<string, string>;
  jobSpec?: FeastJobSpec;
  containerConfigs?: FeastCronJobContainerConfigs;
  schedule?: string;
  timeZone?: string;
  startingDeadlineSeconds?: number;
  concurrencyPolicy?: string;
  suspend?: boolean;
  successfulJobsHistoryLimit?: number;
  failedJobsHistoryLimit?: number;
};

export type FeastBatchEngineConfig = {
  configMapRef?: { name: string };
  configMapKey?: string;
};

export type FeastServiceHostnames = {
  offlineStore?: string;
  onlineStore?: string;
  registry?: string;
  registryRest?: string;
  ui?: string;
};

export type FeatureStoreKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
  };
  spec: {
    feastProject: string;
    feastProjectDir?: FeastProjectDir;
    services?: FeastServices;
    authz?: FeastAuthzConfig;
    cronJob?: FeastCronJob;
    batchEngine?: FeastBatchEngineConfig;
    replicas?: number;
  };
  status?: {
    applied?: {
      feastProject: string;
      feastProjectDir?: FeastProjectDir;
      services?: FeastServices;
      cronJob?: FeastCronJob;
    };
    clientConfigMap?: string;
    conditions?: K8sCondition[];
    cronJob?: string;
    feastVersion?: string;
    phase?: string;
    serviceHostnames?: FeastServiceHostnames;
    replicas?: number;
    selector?: string;
    scalingStatus?: {
      currentReplicas?: number;
      desiredReplicas?: number;
    };
  };
};
