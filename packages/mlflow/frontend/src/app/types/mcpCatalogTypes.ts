export type McpToolAccessType = 'read_only' | 'read_write' | 'execute';

export type McpToolParameter = {
  name: string;
  type: string;
  description?: string;
  required: boolean;
};

export type McpTool = {
  name: string;
  description?: string;
  accessType: McpToolAccessType;
  parameters?: McpToolParameter[];
  revoked?: boolean;
  revokedReason?: string;
};

export type McpServerJsonMeta = Record<string, unknown>;

export type McpServerJson = {
  name?: string;
  version?: string;
  description?: string;
  _meta?: McpServerJsonMeta;
  [key: string]: unknown;
};

export type McpServer = {
  id: string;
  name: string;
  displayName?: string;
  source_id?: string;
  description?: string;
  logo?: string;
  repositoryUrl?: string;
  sourceCode?: string;
  toolCount: number;
  tools?: McpTool[];
  serverJson?: McpServerJson;
};

export type McpToolWithServer = {
  serverId: string;
  tool: McpTool;
};

export type McpToolList = {
  nextPageToken: string;
  pageSize: number;
  size: number;
  items?: McpToolWithServer[];
};

export type McpDeploySpec = {
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
    env?: unknown[];
    envFrom?: unknown[];
    storage?: unknown[];
  };
  runtime?: {
    replicas?: number;
    security?: {
      serviceAccountName?: string;
    };
  };
};

export type McpServerCRData = {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
  };
  spec?: McpDeploySpec;
};
