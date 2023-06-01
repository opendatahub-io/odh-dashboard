import { EnvVariableDataEntry } from '~/pages/projects/types';
import { ContainerResources } from '~/types';

export enum MetricType {
  RUNTIME = 'runtime',
  INFERENCE = 'inference',
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

export enum RefreshIntervalTitle {
  ONE_MINUTE = '1 minute',
  FIVE_MINUTES = '5 minutes',
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
  gpus: number;
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
