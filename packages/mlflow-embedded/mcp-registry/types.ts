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

export type MCPServerVersionStatus = 'draft' | 'active' | 'deprecated' | 'deleted';

export interface MCPServerVersion {
  name: string;
  version: string;
  server_json: MCPServerJSONPayload;
  status?: MCPServerVersionStatus;
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

/**
 * A remote (network-reachable) endpoint the registry advertises for this server version.
 * Per the MCP registry server.json spec, `remotes` is the field that actually declares a
 * server is remotely reachable; `packages` commonly use `stdio` for locally-launched
 * processes and can coexist with a separate `remotes` array for the same version.
 */
export interface MCPServerJSONRemote {
  type: MCPTransportType;
  url?: string;
}

/** Matches `RHAI_DEPLOY_SPEC_META_KEY` in the model-registry package's `catalogToRegistry.ts`. */
export const RHAI_DEPLOY_SPEC_META_KEY = 'com.redhat/deploy-spec';

/** Local mirror of `MCPServerCR['spec']` (model-registry's `mcpDeploymentTypes.ts`). */
export interface MCPServerDeploySpec {
  source: {
    containerImage?: {
      ref: string;
    };
  };
  config: Record<string, unknown>;
  runtime?: Record<string, unknown>;
}

/** Metadata set by the MCP catalog's publish flow; the deploy-spec key may be missing. */
export interface MCPServerJSONMeta {
  [RHAI_DEPLOY_SPEC_META_KEY]?: MCPServerDeploySpec;
}

export interface MCPServerJSONPayload {
  name: string;
  version: string;
  title?: string;
  description?: string;
  packages?: MCPServerJSONPackage[];
  remotes?: MCPServerJSONRemote[];
  _meta?: MCPServerJSONMeta;
}
