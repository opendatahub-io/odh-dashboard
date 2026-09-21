import type { McpServerJson, McpTool } from '~/app/types/mcpCatalogTypes';

export type MCPServerVersionStatus = 'draft' | 'active' | 'deprecated' | 'deleted';

export enum McpRegisterStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
}

export type McpRegistryQueryParams = {
  workspace: string;
};

export type MCPIcon = {
  src: string;
  theme?: 'light' | 'dark';
};

export type MCPTool = {
  name: string;
  title?: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  icons?: MCPIcon[];
  execution?: Record<string, unknown>;
};

export type MCPServerVersion = {
  name: string;
  version: string;
  server_json: McpServerJson;
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

export type SetMCPTagRequest = {
  key: string;
  value?: string;
};

export type RegisterMCPServerRequest = {
  name: string;
  server_json: McpServerJson;
  status?: MCPServerVersionStatus;
  source?: string;
  tools?: McpTool[];
  display_name?: string;
  icons?: MCPIcon[];
  tags?: SetMCPTagRequest[];
};

export type RegisterMCPServerResult = {
  version: MCPServerVersion;
  metadata_error?: string;
  failed_tag_keys?: string[];
};

export type MCPTagEntry = {
  key: string;
  value: string;
};
