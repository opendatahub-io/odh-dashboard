/**
 * TypeScript mirrors of the mlflow BFF's MCP Registry models
 * (packages/mlflow/bff/internal/models/mcp_registry.go). The BFF uses
 * snake_case JSON field names (mirroring MLflow's own MCP Registry API),
 * unlike the rest of this package's camelCase model-registry BFF types.
 */

export type MCPServerVersionStatus = 'draft' | 'active' | 'deprecated' | 'deleted';

export type MCPTool = {
  name: string;
  title?: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  icons?: Record<string, unknown>[];
  execution?: Record<string, unknown>;
};

export type MCPServer = {
  name: string;
  display_name?: string;
  description?: string;
  icons?: Record<string, unknown>[];
  status?: string;
  workspace?: string;
  latest_version?: string;
  aliases?: Record<string, string>;
  tags?: Record<string, string>;
  created_by?: string;
  last_updated_by?: string;
  creation_timestamp?: string;
  last_updated_timestamp?: string;
};

export type MCPServerVersion = {
  name: string;
  version: string;
  server_json: Record<string, unknown>;
  status?: MCPServerVersionStatus;
  workspace?: string;
  tools?: MCPTool[];
  aliases?: string[];
  tags?: Record<string, string>;
  source?: string;
  created_by?: string;
  last_updated_by?: string;
  creation_timestamp?: string;
  last_updated_timestamp?: string;
};

export type CreateMCPServerVersionRequest = {
  server_json: Record<string, unknown>;
  status?: MCPServerVersionStatus;
  source?: string;
  tools?: MCPTool[];
};

export type UpdateMCPServerRequest = {
  display_name?: string;
  description?: string;
  icons?: Record<string, unknown>[];
};

export type SetMCPTagRequest = {
  key: string;
  value?: string;
};

export type MCPIcon = {
  src: string;
  theme?: 'light' | 'dark';
};

/** UI-facing key-value row shape for the Register modal's Tags field. */
export type MCPTagEntry = {
  key: string;
  value: string;
};
