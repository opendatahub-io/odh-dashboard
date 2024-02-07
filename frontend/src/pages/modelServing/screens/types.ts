import { SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import { EnvVariableDataEntry } from '~/pages/projects/types';
import { ContainerResources } from '~/types';
import { TimeframeStepType } from '~/concepts/metrics/types';
import { ModelMetricType, ServerMetricType } from './metrics/ModelServingMetricsContext';

export enum PerformanceMetricType {
  SERVER = 'server',
  MODEL = 'model',
}

export enum MetricType {
  SERVER = 'server',
  MODEL = 'model',
  BIAS = 'bias',
}

export type QueryTimeframeStepType = {
  [key in ServerMetricType | ModelMetricType]: TimeframeStepType;
};

export enum ServingRuntimeTableTabs {
  TYPE = 1,
  DEPLOYED_MODELS = 2,
  TOKENS = 3,
}

export enum InferenceServiceModelState {
  PENDING = 'Pending',
  STANDBY = 'Standby',
  FAILED_TO_LOAD = 'FailedToLoad',
  LOADING = 'Loading',
  LOADED = 'Loaded',
  UNKNOWN = 'Unknown',
}

export type ModelStatus = {
  failedToSchedule: boolean;
};

export type CreatingServingRuntimeObject = {
  name: string;
  servingRuntimeTemplateName: string;
  numReplicas: number;
  modelSize: ModelServingSize;
  externalRoute: boolean;
  tokenAuth: boolean;
  tokens: ServingRuntimeToken[];
};

export type ServingRuntimeToken = {
  uuid: string;
  name: string;
  error: string;
  editName?: string;
};

export type ModelServingSize = {
  name: string;
  resources: ContainerResources;
};

export type CreatingInferenceServiceObject = {
  name: string;
  project: string;
  servingRuntimeName: string;
  storage: InferenceServiceStorage;
  modelSize: ModelServingSize;
  format: InferenceServiceFormat;
  maxReplicas: number;
  minReplicas: number;
  externalRoute: boolean;
  tokenAuth: boolean;
  tokens: ServingRuntimeToken[];
};

export enum InferenceServiceStorageType {
  NEW_STORAGE = 'new-storage',
  EXISTING_STORAGE = 'existing-storage',
}

export type InferenceServiceStorage = {
  type: InferenceServiceStorageType;
  path: string;
  dataConnection: string;
  awsData: EnvVariableDataEntry[];
};

export type InferenceServiceFormat = {
  name: string;
  version?: string;
};

export type ServingRuntimeEditInfo = {
  servingRuntime?: ServingRuntimeKind;
  secrets: SecretKind[];
};

export type ServingPlatformStatuses = {
  kServe: {
    enabled: boolean;
    installed: boolean;
  };
  modelMesh: {
    enabled: boolean;
    installed: boolean;
  };
};
