import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { AgentRuntime, AgentRuntimesList } from '~/app/types/agentRuntimes';

export const listAgentRuntimes =
  (hostPath: string) =>
  (opts: APIOptions): Promise<AgentRuntime[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/agents/runtimes`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<AgentRuntimesList>(response)) {
        return response.data.runtimes;
      }
      throw new Error('Invalid response format');
    });
