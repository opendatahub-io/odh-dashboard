import * as React from 'react';
import {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
  useFetchState,
} from 'mod-arch-core';
import { AgentDeploymentSummary } from '~/app/agentProfile/types';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';

const useFetchAgentDeployments = (
  agentProfileId: string | undefined,
): FetchStateObject<AgentDeploymentSummary[]> => {
  const { api, apiAvailable } = useGenAiAPI();

  const fetchDeployments = React.useCallback<
    FetchStateCallbackPromise<AgentDeploymentSummary[]>
  >(async () => {
    if (!apiAvailable) {
      return Promise.reject(new NotReadyError('API not yet available'));
    }
    if (!agentProfileId) {
      return Promise.reject(new NotReadyError('No agent profile ID'));
    }
    const response = await api.listAgentDeployments({ agentProfileId });
    if (!Array.isArray(response.deployments)) {
      throw new Error('Unexpected response from listAgentDeployments');
    }
    return response.deployments;
  }, [agentProfileId, api, apiAvailable]);

  const [data, loaded, error, refresh] = useFetchState(fetchDeployments, [], {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchAgentDeployments;
