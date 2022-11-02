export type CreatingModelServerObject = {
  numReplicas: number;
  modelSize: ModelServerSize;
  gpus: number;
  externalRoute: boolean;
  tokenAuth: boolean;
  tokens: ModelServerToken[];
};

export type ModelServerToken = {
  uuid: string;
  name: string;
  error: string;
};

export type ModelServerResources = {
  limits: {
    cpu: string;
    memory: string;
  };
  requests: {
    cpu: string;
    memory: string;
  };
};

export type ModelServerSize = {
  name: string;
  resources: ModelServerResources;
};

export type CreatingDeployedServerObject = {
  name: string;
  storage?: DeployedServerStorage;
  storageUri?: string;
  format: DeployedServerFormat;
}

export type DeployedServerStorage = {
  key: string;
  parameters: Record<string, string>;
  path: string;
  schemaPath: string;
} 

export type DeployedServerFormat = {
  name: string;
  version?: string;
}