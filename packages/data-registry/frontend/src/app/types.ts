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

export type ConnectionRef = { type: 'dch'; id: string } | { type: 'rhai'; secret_name: string };

export type AssetResponse = {
  name: string;
  asset_type: string;
  uuid?: string;
  format?: string;
  location?: string;
  content_type?: string;
  columns?: SchemaField[];
  collection?: string;
  connection_ref?: ConnectionRef | null;
  owner?: string;
  description?: string;
  labels?: string[];
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
  labels?: string[];
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
  connection_ref?: ConnectionRef | null;
  description?: string;
  labels?: string[];
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
