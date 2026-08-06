import { APIOptions, handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import { MLFLOW_BFF_PATH } from './const';
import { CreateMcpAccessEndpointRequest, McpAccessEndpoint } from './deployTypes';

const INVALID_PATH_SEGMENTS = new Set(['', '.', '..']);

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
      if (isModArchResponse<McpAccessEndpoint>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
