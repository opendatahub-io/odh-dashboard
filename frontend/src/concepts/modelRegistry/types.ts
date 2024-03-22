export enum RegisteredModelState {
  LIVE = 'LIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ModelVersionState {
  LIVE = 'LIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum InferenceServiceState {
  DEPLOYED = 'DEPLOYED',
  UNDEPLOYED = 'UNDEPLOYED',
}

export enum ExecutionState {
  UNKNOWN = 'UNKNOWN',
  NEW = 'NEW',
  RUNNING = 'RUNNING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
  CACHED = 'CACHED',
  CANCELED = 'CANCELED',
}

export enum ModelArtifactState {
  UNKNOWN = 'UNKNOWN',
  PENDING = 'PENDING',
  LIVE = 'LIVE',
  MARKED_FOR_DELETION = 'MARKED_FOR_DELETION',
  DELETED = 'DELETED',
  ABANDONED = 'ABANDONED',
  REFERENCE = 'REFERENCE',
}

export type ModelRegistryBase = {
  id?: string;
  name?: string;
  externalID?: string;
  description?: string;
  createTimeSinceEpoch?: string;
  lastUpdateTimeSinceEpoch?: string;
  customProperties?: Record<string, unknown>;
};

export type ModelArtifact = ModelRegistryBase & {
  uri?: string;
  state?: ModelArtifactState;
  author?: string;
  modelFormatName?: string;
  storageKey?: string;
  storagePath?: string;
  modelFormatVersion?: string;
  serviceAccountName?: string;
  artifactType: string;
};

export type ModelVersion = ModelRegistryBase & {
  state?: ModelVersionState;
  author?: string;
  registeredModelID: string;
};

export type RegisteredModel = ModelRegistryBase & {
  state?: RegisteredModelState;
};

export type InferenceService = ModelRegistryBase & {
  modelVersionId?: string;
  runtime?: string;
  desiredState?: InferenceServiceState;
  registeredModelId: string;
  servingEnvironmentId: string;
};

export type ServingEnvironment = ModelRegistryBase;

export type ModelRegistryError = {
  code: string;
  message: string;
};

export type ServeModel = ModelRegistryBase & {
  lastKnownState?: ExecutionState;
  modelVersionId: string;
};

export type CreateRegisteredModelData = Omit<
  RegisteredModel,
  'lastUpdateTimeSinceEpoch' | 'createTimeSinceEpoch' | 'id'
>;

export type CreateModelVersionData = Omit<
  ModelVersion,
  'lastUpdateTimeSinceEpoch' | 'createTimeSinceEpoch' | 'id'
>;

export type CreateModelArtifactData = Omit<
  ModelArtifact,
  'lastUpdateTimeSinceEpoch' | 'createTimeSinceEpoch' | 'id' | 'artifactType'
>;

export type ModelRegistryListParams = {
  size: number;
  pageSize: number;
  nextPageToken: string;
};

export type RegisteredModelList = ModelRegistryListParams & { items: RegisteredModel[] };
export type ModelVersionList = ModelRegistryListParams & { items: ModelVersion[] };
export type ModelArtifactList = ModelRegistryListParams & { items: ModelArtifact[] };
