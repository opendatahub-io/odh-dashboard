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

export type Connection = {
  metadata: { id: string; tenant_id?: string };
  resource: {
    name: string;
    data_connection_type_id: string;
    format: 'tabular' | 'binary';
  };
  status: {
    state: 'ready' | 'ingestion_not_ready' | 'not_ready';
    message?: string;
    updated_at?: string;
  };
};

export type ConnectionType = {
  metadata: { id: string; tenant_id?: string };
  resource: {
    name: string;
    provider: string;
    description?: string;
  };
  status?: { capabilities: { flight: boolean; rest: boolean } };
};
