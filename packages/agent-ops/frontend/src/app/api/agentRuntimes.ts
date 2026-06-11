import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { AgentCard } from '~/app/types/agentCard';
import {
  AgentRuntime,
  AgentRuntimeDetail,
  AgentRuntimesList,
} from '~/app/types/agentRuntimes';

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

export const getAgentRuntimeDetail =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string, name: string): Promise<AgentRuntimeDetail> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/agents/runtimes/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<AgentRuntimeDetail>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getAgentCard =
  (hostPath: string) =>
  (opts: APIOptions, namespace: string, name: string): Promise<AgentCard> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/agents/cards/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<AgentCard>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
