export type MCPEnvVarSource = {
  secretKeyRef?: {
    name: string;
    key: string;
  };
  configMapKeyRef?: {
    name: string;
    key: string;
  };
};

export type MCPEnvVar = {
  name: string;
  value?: string;
  valueFrom?: MCPEnvVarSource;
};

export type MCPStorageSource = {
  type: string;
  configMap?: { name: string };
  secret?: { secretName: string };
};

export type MCPStorageMount = {
  path: string;
  permissions?: string;
  source: MCPStorageSource;
};

export type MCPServerCR = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    annotations?: Record<string, string>;
  };
  spec: {
    source: {
      type: string;
      containerImage?: {
        ref: string;
      };
    };
    config: {
      port: number;
      path?: string;
      arguments?: string[];
      env?: MCPEnvVar[];
      envFrom?: unknown[];
      storage?: MCPStorageMount[];
    };
    runtime?: {
      replicas?: number;
      security?: {
        serviceAccountName?: string;
      };
    };
  };
};

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
  serverName?: string;
  namespace: string;
  uid: string;
  creationTimestamp: string;
  image: string;
  yaml?: string;
  phase: McpDeploymentPhase;
  conditions?: McpDeploymentCondition[];
  address?: McpDeploymentAddress;
};

export type McpDeploymentList = {
  items: McpDeployment[];
  size: number;
};

export type McpDeploymentCreateRequest = {
  name?: string;
  displayName?: string;
  serverName?: string;
  image: string;
  yaml?: string;
};

export type McpDeploymentUpdateRequest = {
  displayName?: string;
  serverName?: string;
  image?: string;
  yaml?: string;
};
