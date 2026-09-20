import {
  APIOptions,
  isModArchResponse,
  restGET,
  restDELETE,
  handleRestFailures,
} from 'mod-arch-core';
import { McpDeploymentList } from '~/odh/types/mcpDeploymentTypes';

export const deleteMcpDeployment =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, name: string): Promise<void> =>
    handleRestFailures(
      restDELETE(hostPath, `/mcp_deployments/${name}`, {}, queryParams, {
        ...opts,
        parseJSON: false,
      }),
    ).then(() => undefined);

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
