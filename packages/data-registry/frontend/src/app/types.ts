export type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string;
  'openshift.io/display-name': string;
}>;

export type K8sCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string;
  lastTransitionTime?: string;
  lastHeartbeatTime?: string;
};

export type ListConfigSecretsResponse = {
  secrets: { name: string; keys: string[] }[];
  configMaps: { name: string; keys: string[] }[];
};

export type ConfigSecretItem = {
  name: string;
  keys: string[];
};

export type NamespaceKind = {
  name: string;
  displayName?: string;
};

// ---------------------------------------------------------------------------
// Data Registry API types (aligned with OpenAPI spec data-registry-api.yaml)
// ---------------------------------------------------------------------------

export type SchemaField = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
};

export type DchConnectionRef = {
  type: 'dch';
  id: string;
};

export type RhaiConnectionRef = {
  type: 'rhai';
  secret_name: string;
};

export type ConnectionRef = DchConnectionRef | RhaiConnectionRef;

export type UnstructuredFormat = 'documents' | 'images' | 'audio' | 'video' | 'binary' | 'other';

export type StructuredFormat =
  'iceberg' | 'parquet' | 'csv' | 'delta' | 'postgresql' | 'milvus' | 'other';

export type AssetFormat = UnstructuredFormat | StructuredFormat;

export type AssetResponseBase = {
  name: string;
  uuid: string;
  storage_location?: string | null;
  columns?: SchemaField[] | null;
  collection: string;
  connection_ref?: ConnectionRef | null;
  owner: string;
  description?: string | null;
  labels?: string[] | null;
  properties?: Record<string, string> | null;
  created_at: string;
  updated_at: string;
};

export type StructuredAssetResponse = AssetResponseBase & {
  asset_type: 'table';
  format: string;
};

export type UnstructuredAssetResponse = AssetResponseBase & {
  asset_type: 'volume';
  format: string;
};

export type AssetResponse = StructuredAssetResponse | UnstructuredAssetResponse;

export type AssetListResponse = {
  assets: StructuredAssetResponse[];
};

export type ListVolumesResponse = {
  volumes: UnstructuredAssetResponse[];
};

export type ListNamespacesResponse = {
  namespaces: string[][];
};

export type NamespaceResponse = {
  namespace: string[];
  properties: Record<string, string>;
};

export type CreateNamespaceRequest = {
  namespace: string[];
  properties?: Record<string, string>;
};

export type CreateVolumeRequest = {
  name: string;
  format: UnstructuredFormat;
  storage_location?: string;
  connection_ref?: ConnectionRef | null;
  description?: string;
  purpose?: string;
  license?: string;
  maturity?: string;
  domain?: string;
  pii?: string;
  labels?: string[];
  properties?: Record<string, string>;
};

export type CreateGenericTableRequest = {
  name: string;
  format: StructuredFormat;
  storage_location?: string;
  connection_ref?: ConnectionRef | null;
  description?: string;
  purpose?: string;
  license?: string;
  maturity?: string;
  domain?: string;
  pii?: string;
  labels?: string[];
  schema_fields?: SchemaField[];
  properties?: Record<string, string>;
};

export type LabelListResponse = {
  labels: string[];
};

export type CreateLabelRequest = {
  name: string;
};

export type LabelResponse = {
  name: string;
};

export type ErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
  };
};

export type ConnectionModel = {
  name: string;
  displayName?: string;
  connectionType?: string;
};
