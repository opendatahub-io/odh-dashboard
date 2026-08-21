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

export enum McpConditionType {
  ACCEPTED = 'Accepted',
  READY = 'Ready',
}

export enum McpConditionStatus {
  TRUE = 'True',
  FALSE = 'False',
}

export enum McpAcceptedReason {
  VALID = 'Valid',
  INVALID = 'Invalid',
}

export enum McpReadyReason {
  AVAILABLE = 'Available',
  CONFIGURATION_INVALID = 'ConfigurationInvalid',
  DEPLOYMENT_UNAVAILABLE = 'DeploymentUnavailable',
  SCALED_TO_ZERO = 'ScaledToZero',
  INITIALIZING = 'Initializing',
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
  /** Distinct from `serverName`, which traces catalog (not registry) deployments. */
  registryServer?: string;
  registryVersion?: string;
  /** Resolved server-side from the MLflow BFF when `registryServer` is set. Best-effort:
   * empty if it couldn't be resolved, so consumers should fall back to `registryServer`. */
  registryServerDisplayName?: string;
  namespace: string;
  uid: string;
  creationTimestamp: string;
  image: string;
  /** Actually-applied spec.config values, not requested ones. */
  port: number;
  path?: string;
  yaml?: string;
  conditions: McpDeploymentCondition[];
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
  registryServer?: string;
  registryVersion?: string;
  image: string;
  yaml?: string;
};

export type McpDeploymentUpdateRequest = {
  displayName?: string;
  serverName?: string;
  registryServer?: string;
  registryVersion?: string;
  image?: string;
  yaml?: string;
};

export type McpDeployModalData = {
  name?: string;
  displayName?: string;
  namespace?: string;
  serverName?: string;
  /**
   * Distinct from `serverName`, which traces catalog (not registry) deployments.
   *
   * McpDeployModal also uses this field's presence as its sole signal for whether it's
   * prefilling from an external MCP Registry ("registry" flow, image editable, project
   * fixed) vs. from the internal catalog ("catalog" flow, image read-only, project
   * selectable). If you add a new caller/flow, set (or deliberately omit) `registryServer`
   * to match the UI behavior you want -- see `isRegistryPrefill` in McpDeployModal.
   */
  registryServer?: string;
  registryVersion?: string;
  image: string;
  yaml?: string;
};
