export enum ConnectionTypeRefs {
  S3 = 's3',
  URI = 'uri-v1',
  OCI = 'oci-v1',
}

export enum ModelLocationType {
  EXISTING = 'existing',
  URI = 'uri-v1',
  OCI = 'oci-v1',
  PVC = 'pvc',
  S3 = 's3',
}

export type ModelLocation = {
  name?: string;
  description?: string;
};

export type ExistingModelLocation = ModelLocation & {
  type: 'existing';
  connection: string;
  connectionType: ConnectionTypeRefs;
  modelPath?: string; // For S3
  modelUri?: string; // For OCI/URI
};

export type OCIModelLocation = ModelLocation & {
  type: ModelLocationType.OCI;
  accessType?: string[];
  secretDetails: string;
  registryHost: string;
  uri: string;
};

export type S3ModelLocation = ModelLocation & {
  type: ModelLocationType.S3;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  region?: string;
  bucket?: string;
  path: string;
};

export type PVCModelLocation = ModelLocation & {
  type: ModelLocationType.PVC;
  storageUri: string;
};

export type URIModelLocation = ModelLocation & {
  type: ModelLocationType.URI;
  uri: string;
};

export type ModelLocationData =
  | ExistingModelLocation
  | OCIModelLocation
  | S3ModelLocation
  | PVCModelLocation
  | URIModelLocation;

export const isOCIModelLocation = (data?: ModelLocationData): data is OCIModelLocation => {
  return data?.type === ModelLocationType.OCI;
};

export const isS3ModelLocation = (data?: ModelLocationData): data is S3ModelLocation => {
  return data?.type === ModelLocationType.S3;
};

export const isExistingModelLocation = (
  data?: ModelLocationData,
): data is ExistingModelLocation => {
  return data?.type === 'existing';
};
