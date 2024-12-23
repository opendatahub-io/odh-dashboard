import { AlertVariant } from '@patternfly/react-core';
import { SecretKind, ServingContainer, ServingRuntimeKind } from '~/k8sTypes';
import { DataConnection, EnvVariableDataEntry } from '~/pages/projects/types';
import { ContainerResources } from '~/types';

export enum PerformanceMetricType {
  SERVER = 'server',
  MODEL = 'model',
}

export enum MetricType {
  SERVER = 'server',
  MODEL = 'model',
  BIAS = 'bias',
}

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

export type SupportedModelFormatsInfo = {
  name: string;
  version: string;
  autoSelect?: boolean;
  priority?: number;
};

export type CreatingServingRuntimeObject = CreatingModelServingObjectCommon & {
  servingRuntimeTemplateName: string;
  numReplicas: number;
  imageName?: string;
  supportedModelFormatsInfo?: SupportedModelFormatsInfo;
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

export type CreatingInferenceServiceObject = CreatingModelServingObjectCommon & {
  project: string;
  servingRuntimeName: string;
  storage: InferenceServiceStorage;
  format: InferenceServiceFormat;
  maxReplicas: number;
  minReplicas: number;
  labels?: Record<string, string>;
  servingRuntimeArgs?: ServingContainer['args'];
  servingRuntimeEnvVars?: ServingContainer['env'];
  isKServeRawDeployment?: boolean;
};

export type CreatingModelServingObjectCommon = {
  name: string;
  k8sName: string;
  modelSize: ModelServingSize;
  externalRoute: boolean;
  tokenAuth: boolean;
  tokens: ServingRuntimeToken[];
};

export enum InferenceServiceStorageType {
  NEW_STORAGE = 'new-storage',
  EXISTING_STORAGE = 'existing-storage',
  EXISTING_URI = 'existing-uri',
}

export type InferenceServiceStorage = {
  type: InferenceServiceStorageType;
  path: string;
  dataConnection: string;
  uri?: string;
  awsData: EnvVariableDataEntry[];
  alert?: {
    type: AlertVariant;
    title: string;
    message: string;
  };
};

export type InferenceServiceFormat = {
  name: string;
  version?: string;
};

export type ServingRuntimeEditInfo = {
  servingRuntime?: ServingRuntimeKind;
  secrets: SecretKind[];
};

type PlatformStatus = {
  enabled: boolean;
  installed: boolean;
};
export type ServingPlatformStatuses = {
  kServe: PlatformStatus;
  kServeNIM: PlatformStatus;
  modelMesh: PlatformStatus;
  platformEnabledCount: number;
};

export type LabeledDataConnection = {
  dataConnection: DataConnection;
  isRecommended?: boolean;
};
