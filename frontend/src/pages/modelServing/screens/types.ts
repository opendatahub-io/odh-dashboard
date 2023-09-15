import { EnvVariableDataEntry } from '~/pages/projects/types';
import { ContainerResources } from '~/types';
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

export enum TimeframeTitle {
  ONE_HOUR = '1 hour',
  ONE_DAY = '24 hours',
  ONE_WEEK = '7 days',
  ONE_MONTH = '30 days',
  // UNLIMITED = 'Unlimited',
}

export type TimeframeTimeType = {
  [key in TimeframeTitle]: number;
};

export type TimeframeStepType = TimeframeTimeType;

export type QueryTimeframeStepType = {
  [key in ServerMetricType | ModelMetricType]: TimeframeStepType;
};

export enum RefreshIntervalTitle {
  FIFTEEN_SECONDS = '15 seconds',
  THIRTY_SECONDS = '30 seconds',
  ONE_MINUTE = '1 minute',
  FIVE_MINUTES = '5 minutes',
  FIFTEEN_MINUTES = '15 minutes',
  THIRTY_MINUTES = '30 minutes',
  ONE_HOUR = '1 hour',
  TWO_HOURS = '2 hours',
  ONE_DAY = '1 day',
}

export type RefreshIntervalValueType = {
  [key in RefreshIntervalTitle]: number;
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

export type CreatingServingRuntimeObject = {
  name: string;
  servingRuntimeTemplateName: string;
  numReplicas: number;
  modelSize: ServingRuntimeSize;
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

export type ServingRuntimeSize = {
  name: string;
  resources: ContainerResources;
};

export type CreatingInferenceServiceObject = {
  name: string;
  project: string;
  servingRuntimeName: string;
  storage: InferenceServiceStorage;
  format: InferenceServiceFormat;
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
