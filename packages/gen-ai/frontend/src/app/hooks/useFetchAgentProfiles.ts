import * as React from 'react';
import {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
  useFetchState,
} from 'mod-arch-core';
import { AgentProfileSummary } from '~/app/agentProfile/types';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchAgentProfiles = (): FetchStateObject<AgentProfileSummary[]> => {
  const { api, apiAvailable } = useGenAiAPI();

  const fetchAgentProfiles = React.useCallback<
    FetchStateCallbackPromise<AgentProfileSummary[]>
  >(async () => {
    if (!apiAvailable) {
      return Promise.reject(new NotReadyError('API not yet available'));
    }
    const response = await api.listAgentProfiles();
    return Array.isArray(response.profiles) ? response.profiles : [];
  }, [api, apiAvailable]);

  const [data, loaded, error, refresh] = useFetchState(fetchAgentProfiles, [], {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchAgentProfiles;
