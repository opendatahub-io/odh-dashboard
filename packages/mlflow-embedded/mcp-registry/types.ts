// Field names mirror the external MCP Registry API (snake_case).
/* eslint-disable camelcase */
/** Local mirrors of MCP Registry types. Can't import across Module Federation boundary. */

export enum MCPTransportType {
  STDIO = 'stdio',
  STREAMABLE_HTTP = 'streamable-http',
  SSE = 'sse',
}

export interface MCPServer {
  name: string;
  display_name?: string;
  description?: string;
  latest_version?: string;
}

export interface MCPServerVersion {
  name: string;
  version: string;
  server_json: MCPServerJSONPayload;
}

export interface MCPServerJSONTransport {
  type: MCPTransportType;
  url?: string;
}

export interface MCPServerJSONPackage {
  registryType: string;
  identifier: string;
  transport: MCPServerJSONTransport;
  version?: string;
}

/** Metadata set by the MCP catalog's publish flow; either field may be missing. */
export interface MCPServerJSONMeta {
  image?: string;
  configuration?: string; // YAML string
}

export interface MCPServerJSONPayload {
  name: string;
  version: string;
  title?: string;
  description?: string;
  packages?: MCPServerJSONPackage[];
  _meta?: MCPServerJSONMeta;
}
