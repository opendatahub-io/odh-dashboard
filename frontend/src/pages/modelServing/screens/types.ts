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
  storage?: InferenceServiceStorage;
  storageUri?: string;
  format: InferenceServiceFormat;
};

export type InferenceServiceStorage = {
  key: string;
  parameters: Record<string, string>;
  path: string;
  schemaPath: string;
};

export type InferenceServiceFormat = {
  name: string;
  version?: string;
};
