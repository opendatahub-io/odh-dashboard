export type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string;
  'openshift.io/display-name': string;
}>;

export type K8sCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string | null;
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
  uuid?: string | null;
  format?: string | null;
  location?: string | null;
  content_type?: string | null;
  columns?: SchemaField[] | null;
  collection?: string | null;
  connection_ref?: ConnectionRef | null;
  owner?: string | null;
  description?: string | null;
  labels?: string[] | null;
  properties?: Record<string, string> | null;
  registered_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  comment?: string | null;
  owner?: string | null;
  'created-at'?: string | null;
  'updated-at'?: string | null;
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

export type LabelListResponse = {
  labels: string[];
};

export type ErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
  };
};
