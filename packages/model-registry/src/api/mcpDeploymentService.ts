import {
  APIOptions,
  isModArchResponse,
  restGET,
  restDELETE,
  handleRestFailures,
} from 'mod-arch-core';
import { McpDeployment, McpDeploymentList, McpDeploymentPhase } from '../types/mcpDeploymentTypes';

const validPhases = new Set(Object.values(McpDeploymentPhase));

const validatePhase = (deployment: McpDeployment): McpDeployment => {
  if (!validPhases.has(deployment.phase)) {
    return { ...deployment, phase: McpDeploymentPhase.PENDING };
  }
  return deployment;
};

export const deleteMcpDeployment =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions, name: string): Promise<void> =>
    handleRestFailures(
      restDELETE(hostPath, `/mcp_deployments/${name}`, {}, queryParams, {
        ...opts,
        // BFF returns 204 No Content with an empty body; JSON.parse("") throws without this.
        parseJSON: false,
      }),
    ).then(() => undefined);

export const getListMcpDeployments =
  (hostPath: string, queryParams: Record<string, unknown> = {}) =>
  (opts: APIOptions): Promise<McpDeploymentList> =>
    handleRestFailures(restGET(hostPath, `/mcp_deployments`, queryParams, opts)).then(
      (response) => {
        if (isModArchResponse<McpDeploymentList>(response)) {
          return {
            ...response.data,
            items: response.data.items.map(validatePhase),
          };
        }
        throw new Error('Invalid response format');
      },
    );
