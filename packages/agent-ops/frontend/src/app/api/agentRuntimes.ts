import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { AgentRuntime, AgentRuntimeDetail, AgentRuntimesList } from '~/app/types/agentRuntimes';

export type ListAgentRuntimesParams = {
  limit?: number;
  continueToken?: string;
};

export type ListAgentRuntimesResult = {
  runtimes: AgentRuntime[];
  continueToken?: string;
};

export const listAgentRuntimes =
  (hostPath: string) =>
  (opts: APIOptions, params?: ListAgentRuntimesParams): Promise<ListAgentRuntimesResult> => {
    const queryParams: Record<string, string> = {};
    if (params?.limit != null) {
      queryParams.limit = String(params.limit);
    }
    if (params?.continueToken) {
      queryParams.continueToken = params.continueToken;
    }

    return handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/agents/runtimes`, queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<AgentRuntimesList>(response)) {
        return {
          runtimes: response.data.runtimes,
          continueToken: response.data.continueToken,
        };
      }
      throw new Error('Invalid response format');
    });
  };

export const getAgentRuntimeDetail =
  (hostPath: string, namespace: string, name: string) =>
  (opts: APIOptions): Promise<AgentRuntimeDetail> =>
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
