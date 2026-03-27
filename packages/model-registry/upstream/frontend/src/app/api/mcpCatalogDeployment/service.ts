import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { URL_PREFIX, BFF_API_VERSION } from '~/app/utilities/const';
import { MCPServerCR } from '~/app/mcpDeploymentTypes';

export type McpServerAvailabilityResponse = {
  available: boolean;
};

export const getMcpServerAvailability =
  (hostPath: string) =>
  (opts: APIOptions): Promise<McpServerAvailabilityResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/mcp_catalog/mcp_server_available`,
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<McpServerAvailabilityResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getMcpServerConverter =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, serverId: string): Promise<MCPServerCR> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/mcp_catalog/mcp_servers/${serverId}/mcpserver`,
        queryParams,
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<MCPServerCR>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
