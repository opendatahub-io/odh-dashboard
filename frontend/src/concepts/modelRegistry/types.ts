import { K8sAPIOptions } from '~/k8sTypes';

export enum ModelState {
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

export enum ModelRegistryMetadataType {
  INT = 'MetadataIntValue',
  DOUBLE = 'MetadataDoubleValue',
  STRING = 'MetadataStringValue',
  STRUCT = 'MetadataStructValue',
  PROTO = 'MetadataProtoValue',
  BOOL = 'MetadataBoolValue',
}

export type ModelRegistryCustomPropertyInt = {
  metadataType: ModelRegistryMetadataType.INT;
  int_value: string; // int64-formatted string
};

export type ModelRegistryCustomPropertyDouble = {
  metadataType: ModelRegistryMetadataType.DOUBLE;
  double_value: number;
};

export type ModelRegistryCustomPropertyString = {
  metadataType: ModelRegistryMetadataType.STRING;
  string_value: string;
};

export type ModelRegistryCustomPropertyStruct = {
  metadataType: ModelRegistryMetadataType.STRUCT;
  struct_value: string; // Base64 encoded bytes for struct value
};

export type ModelRegistryCustomPropertyProto = {
  metadataType: ModelRegistryMetadataType.PROTO;
  type: string; // url describing proto value
  proto_value: string; // Base64 encoded bytes for proto value
};

export type ModelRegistryCustomPropertyBool = {
  metadataType: ModelRegistryMetadataType.BOOL;
  bool_value: boolean;
};

export type ModelRegistryCustomProperty =
  | ModelRegistryCustomPropertyInt
  | ModelRegistryCustomPropertyDouble
  | ModelRegistryCustomPropertyString
  | ModelRegistryCustomPropertyStruct
  | ModelRegistryCustomPropertyProto
  | ModelRegistryCustomPropertyBool;

export type ModelRegistryCustomProperties = Record<string, ModelRegistryCustomProperty>;
export type ModelRegistryStringCustomProperties = Record<string, ModelRegistryCustomPropertyString>;

export type ModelRegistryBase = {
  id: string;
  name: string;
  externalID?: string;
  description?: string;
  createTimeSinceEpoch?: string;
  lastUpdateTimeSinceEpoch: string;
  customProperties: ModelRegistryCustomProperties;
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
  state?: ModelState;
  author?: string;
  registeredModelId: string;
};

export type RegisteredModel = ModelRegistryBase & {
  state?: ModelState;
  owner?: string;
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
  'lastUpdateTimeSinceEpoch' | 'createTimeSinceEpoch' | 'id'
>;

export type ModelRegistryListParams = {
  size: number;
  pageSize: number;
  nextPageToken: string;
};

export type RegisteredModelList = ModelRegistryListParams & { items: RegisteredModel[] };

export type ModelVersionList = ModelRegistryListParams & { items: ModelVersion[] };

export type ModelArtifactList = ModelRegistryListParams & { items: ModelArtifact[] };

export type CreateRegisteredModel = (
  opts: K8sAPIOptions,
  data: CreateRegisteredModelData,
) => Promise<RegisteredModel>;

export type CreateModelVersion = (
  opts: K8sAPIOptions,
  data: CreateModelVersionData,
) => Promise<ModelVersion>;

export type CreateModelVersionForRegisteredModel = (
  opts: K8sAPIOptions,
  registeredModelId: string,
  data: CreateModelVersionData,
) => Promise<ModelVersion>;

export type CreateModelArtifact = (
  opts: K8sAPIOptions,
  data: CreateModelArtifactData,
) => Promise<ModelArtifact>;

export type CreateModelArtifactForModelVersion = (
  opts: K8sAPIOptions,
  modelVersionId: string,
  data: CreateModelArtifactData,
) => Promise<ModelArtifact>;

export type GetRegisteredModel = (
  opts: K8sAPIOptions,
  registeredModelId: string,
) => Promise<RegisteredModel>;

export type GetModelVersion = (
  opts: K8sAPIOptions,
  modelversionId: string,
) => Promise<ModelVersion>;

export type GetModelArtifact = (
  opts: K8sAPIOptions,
  modelartifactId: string,
) => Promise<ModelArtifact>;

export type GetListModelArtifacts = (opts: K8sAPIOptions) => Promise<ModelArtifactList>;

export type GetListModelVersions = (opts: K8sAPIOptions) => Promise<ModelVersionList>;

export type GetListRegisteredModels = (opts: K8sAPIOptions) => Promise<RegisteredModelList>;

export type GetModelVersionsByRegisteredModel = (
  opts: K8sAPIOptions,
  registeredmodelId: string,
) => Promise<ModelVersionList>;

export type GetModelArtifactsByModelVersion = (
  opts: K8sAPIOptions,
  modelVersionId: string,
) => Promise<ModelArtifactList>;

export type PatchRegisteredModel = (
  opts: K8sAPIOptions,
  data: Partial<RegisteredModel>,
  registeredModelId: string,
) => Promise<RegisteredModel>;

export type PatchModelVersion = (
  opts: K8sAPIOptions,
  data: Partial<ModelVersion>,
  modelversionId: string,
) => Promise<ModelVersion>;

export type PatchModelArtifact = (
  opts: K8sAPIOptions,
  data: Partial<ModelArtifact>,
  modelartifactId: string,
) => Promise<ModelArtifact>;

export type ModelRegistryAPIs = {
  createRegisteredModel: CreateRegisteredModel;
  createModelVersion: CreateModelVersion;
  createModelVersionForRegisteredModel: CreateModelVersionForRegisteredModel;
  createModelArtifact: CreateModelArtifact;
  createModelArtifactForModelVersion: CreateModelArtifactForModelVersion;
  getRegisteredModel: GetRegisteredModel;
  getModelVersion: GetModelVersion;
  getModelArtifact: GetModelArtifact;
  listModelArtifacts: GetListModelArtifacts;
  listModelVersions: GetListModelVersions;
  listRegisteredModels: GetListRegisteredModels;
  getModelVersionsByRegisteredModel: GetModelVersionsByRegisteredModel;
  getModelArtifactsByModelVersion: GetModelArtifactsByModelVersion;
  patchRegisteredModel: PatchRegisteredModel;
  patchModelVersion: PatchModelVersion;
  patchModelArtifact: PatchModelArtifact;
};
