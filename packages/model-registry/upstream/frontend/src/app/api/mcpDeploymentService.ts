import { APIOptions, isModArchResponse, restGET, handleRestFailures } from 'mod-arch-core';
import { McpDeploymentList } from '~/app/mcpDeploymentTypes';

export const getListMcpDeployments =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions): Promise<McpDeploymentList> =>
    handleRestFailures(restGET(hostPath, `/mcp_deployments`, queryParams, opts)).then(
      (response) => {
        if (isModArchResponse<McpDeploymentList>(response)) {
          return response.data;
        }
        throw new Error('Invalid response format');
      },
    );
