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

export type AssetResponse = {
  name: string;
  asset_type: string;
  uuid?: string;
  format?: string;
  location?: string;
  content_type?: string;
  columns?: SchemaField[];
  collection?: string;
  // Backend will return ConnectionRef object per OpenAPI spec; currently returns a plain string
  connection_ref?: ConnectionRef | string | null;
  owner?: string;
  description?: string;
  labels?: string[] | null;
  properties?: Record<string, string>;
  registered_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type AssetListResponse = {
  assets: AssetResponse[];
};

export type VolumeInfo = {
  name: string;
  'catalog-name': string;
  'schema-name': string;
  'volume-type': string;
  'storage-location': string;
  comment?: string;
  owner?: string;
  'created-at'?: string;
  'updated-at'?: string;
  labels?: string[] | null;
  properties?: Record<string, string>;
  config?: Record<string, string>;
};

export type ListVolumesResponse = {
  volumes: VolumeInfo[];
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
  location?: string;
  content_type?: string;
  connection_ref?: string;
  description?: string;
  labels?: string[];
  properties?: Record<string, string>;
};

export type CreateGenericTableRequest = {
  name: string;
  format?: string;
  location?: string;
  connection_ref?: string;
  description?: string;
  purpose?: string;
  license?: string;
  maturity?: string;
  domain?: string;
  pii?: string;
  owner?: string;
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
