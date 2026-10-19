import * as React from 'react';
import {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
  useFetchState,
} from 'mod-arch-core';
import { AgentProfile } from '~/app/agentProfile/types';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';

const useFetchAgentProfile = (
  profileId: string | undefined,
): FetchStateObject<AgentProfile | null> => {
  const { api, apiAvailable } = useGenAiAPI();

  const fetchAgentProfile = React.useCallback<
    FetchStateCallbackPromise<AgentProfile | null>
  >(async () => {
    if (!apiAvailable) {
      return Promise.reject(new NotReadyError('API not yet available'));
    }
    if (!profileId) {
      return Promise.reject(new NotReadyError('No agent profile ID'));
    }
    return api.getAgentProfile({ id: profileId });
  }, [api, apiAvailable, profileId]);

  const [data, loaded, error, refresh] = useFetchState(fetchAgentProfile, null, {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchAgentProfile;
