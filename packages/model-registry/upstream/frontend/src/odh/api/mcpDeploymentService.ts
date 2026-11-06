import {
  APIOptions,
  isModArchResponse,
  restGET,
  restDELETE,
  handleRestFailures,
} from 'mod-arch-core';
import { McpDeploymentList } from '~/odh/types/mcpDeploymentTypes';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export const deleteMcpDeployment =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, name: string): Promise<void> =>
    handleRestFailures(
      restDELETE(hostPath, `/mcp_deployments/${name}`, {}, queryParams, {
        ...opts,
        parseJSON: false,
      }),
    ).then(() => undefined);

/**
 * Remove the Project Matrix layer-owned Gateway resources for a project.
 * This endpoint never deletes shared RHCL, Gateway API, operator, or ingress
 * resources; it only removes resources carrying the Gateway layer ownership.
 */
export const deleteMcpGatewayLayer =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/mcp_deployments`,
        {},
        { ...queryParams, layer: 'gateway' },
        { ...opts, parseJSON: false },
      ),
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
