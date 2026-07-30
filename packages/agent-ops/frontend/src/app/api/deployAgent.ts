import { APIOptions, handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import type { DeployAgentRequest, DeployAgentResponse } from '~/app/types/deployAgent';

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isDeployAgentResponse = (value: unknown): value is DeployAgentResponse => {
  if (!isUnknownRecord(value)) {
    return false;
  }

  return (
    typeof value.success === 'boolean' &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    typeof value.namespace === 'string' &&
    value.namespace.length > 0
  );
};

export const deployAgent =
  (hostPath = '') =>
  (opts: APIOptions, request: DeployAgentRequest): Promise<DeployAgentResponse> =>
    handleRestFailures(
      restCREATE(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/agents/deploy`, request, {}, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isDeployAgentResponse(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
