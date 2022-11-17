import { EnvVariableDataEntry } from 'pages/projects/types';

export enum ServingRuntimeTableTabs {
  TYPE = 1,
  DEPLOYED_MODELS = 2,
  TOKENS = 3,
}

export type CreatingServingRuntimeObject = {
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

export type ServingRuntimeResources = {
  limits: {
    cpu: string;
    memory: string;
  };
  requests: {
    cpu: string;
    memory: string;
  };
};

export type ServingRuntimeSize = {
  name: string;
  resources: ServingRuntimeResources;
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
