import * as React from 'react';
import {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
  useFetchState,
} from 'mod-arch-core';
import { AgentDeploymentSummary } from '~/app/agentProfile/types';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';

type UseFetchAgentDeploymentsOptions = {
  includeAll?: boolean;
};

const useFetchAgentDeployments = (
  agentProfileId: string | undefined,
  { includeAll = false }: UseFetchAgentDeploymentsOptions = {},
): FetchStateObject<AgentDeploymentSummary[]> => {
  const { api, apiAvailable } = useGenAiAPI();

  const fetchDeployments = React.useCallback<
    FetchStateCallbackPromise<AgentDeploymentSummary[]>
  >(async () => {
    if (!apiAvailable) {
      return Promise.reject(new NotReadyError('API not yet available'));
    }
    if (!agentProfileId && !includeAll) {
      return Promise.reject(new NotReadyError('No agent profile ID'));
    }
    const response = await api.listAgentDeployments(agentProfileId ? { agentProfileId } : {});
    if (!Array.isArray(response.deployments)) {
      throw new Error('Unexpected response from listAgentDeployments');
    }
    return response.deployments;
  }, [agentProfileId, api, apiAvailable, includeAll]);

  const [data, loaded, error, refresh] = useFetchState(fetchDeployments, [], {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchAgentDeployments;
