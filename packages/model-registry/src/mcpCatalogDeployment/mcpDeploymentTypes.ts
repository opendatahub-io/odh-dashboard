export enum McpDeploymentPhase {
  PENDING = 'Pending',
  RUNNING = 'Running',
  FAILED = 'Failed',
}

export type McpDeploymentCondition = {
  type: string;
  status: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
};

export type McpDeploymentAddress = {
  url: string;
};

export type McpDeployment = {
  name: string;
  displayName?: string;
  namespace: string;
  uid: string;
  creationTimestamp: string;
  image: string;
  port: number;
  yaml?: string;
  phase: McpDeploymentPhase;
  conditions?: McpDeploymentCondition[];
  address?: McpDeploymentAddress;
};

export type McpDeploymentList = {
  items: McpDeployment[];
  nextPageToken?: string;
  pageSize: number;
  size: number;
};

export type McpDeploymentCreateRequest = {
  name?: string;
  displayName?: string;
  image: string;
  port?: number;
  yaml?: string;
};

export type McpDeploymentUpdateRequest = {
  displayName?: string;
  image?: string;
  port?: number;
  yaml?: string;
};

export type MCPServerMetadata = {
  name: string;
  namespace?: string;
  annotations?: Record<string, string>;
};

export type MCPContainerImage = {
  ref: string;
};

export type MCPSourceSpec = {
  type: string;
  containerImage?: MCPContainerImage;
};

export type MCPEnvVar = {
  name: string;
  value?: string;
  valueFrom?: {
    secretKeyRef?: { name: string; key: string };
    configMapKeyRef?: { name: string; key: string };
  };
};

export type MCPStorageSource = {
  type: string;
  configMap?: { name: string; items?: { key: string; path: string }[] };
  secret?: { secretName: string; items?: { key: string; path: string }[] };
};

export type MCPStorageMount = {
  path: string;
  permissions?: string;
  source: MCPStorageSource;
};

export type MCPConfigSpec = {
  port: number;
  path?: string;
  arguments?: string[];
  env?: MCPEnvVar[];
  storage?: MCPStorageMount[];
};

export type MCPSecuritySpec = {
  serviceAccountName?: string;
};

export type MCPRuntimeSpec = {
  replicas?: number;
  security?: MCPSecuritySpec;
};

export type MCPServerSpec = {
  source: MCPSourceSpec;
  config: MCPConfigSpec;
  runtime?: MCPRuntimeSpec;
};

export type MCPServerCR = {
  apiVersion: string;
  kind: string;
  metadata: MCPServerMetadata;
  spec: MCPServerSpec;
};
