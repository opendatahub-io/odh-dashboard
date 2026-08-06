import { APIOptions, handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import { MLFLOW_BFF_PATH } from './const';
import { CreateMcpAccessEndpointRequest, McpAccessEndpoint } from './deployTypes';

// Escape "/" per segment; literal "/" in middle survives encoding
const mcpServerNamePathSegment = (name: string): string =>
  name.split('/').map(encodeURIComponent).join('/');

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
