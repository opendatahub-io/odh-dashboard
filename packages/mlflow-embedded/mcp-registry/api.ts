import { APIOptions, handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import { MLFLOW_BFF_PATH } from './const';
import { CreateMcpAccessEndpointRequest, McpAccessEndpoint } from './deployTypes';
import { MCPTransportType } from './types';

const INVALID_PATH_SEGMENTS = new Set(['', '.', '..']);

const VALID_TRANSPORT_TYPES = new Set<string>(Object.values(MCPTransportType));

// isModArchResponse<T>'s generic is a compile-time cast, not a runtime check of T's shape --
// it only verifies the response has a `data` property. Without this, a malformed payload
// (e.g. `{ data: null }`) would be reported as a successfully registered endpoint by callers.
const isMcpAccessEndpoint = (value: unknown): value is McpAccessEndpoint => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = Object.fromEntries(Object.entries(value));
  return (
    typeof record.id === 'string' &&
    typeof record.server_name === 'string' &&
    typeof record.endpoint_url === 'string' &&
    typeof record.transport_type === 'string' &&
    VALID_TRANSPORT_TYPES.has(record.transport_type)
  );
};

// Escape "/" per segment; literal "/" in middle survives encoding. Reject
// empty/"."/".." segments so a crafted name (e.g. "../servers/other") can't
// traverse to a different server's BFF route (CWE-22).
const mcpServerNamePathSegment = (name: string): string => {
  const segments = name.split('/');
  if (segments.some((segment) => INVALID_PATH_SEGMENTS.has(segment))) {
    throw new Error(`Invalid MCP registry server name: ${name}`);
  }
  return segments.map(encodeURIComponent).join('/');
};

export const createMcpAccessEndpoint =
  (registryServerName: string, workspace: string) =>
  (opts: APIOptions, data: CreateMcpAccessEndpointRequest): Promise<McpAccessEndpoint> =>
    handleRestFailures(
      restCREATE(
        '',
        `${MLFLOW_BFF_PATH}/mcp-registry/servers/${mcpServerNamePathSegment(
          registryServerName,
        )}/endpoints`,
        data,
        { workspace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<McpAccessEndpoint>(response) && isMcpAccessEndpoint(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
