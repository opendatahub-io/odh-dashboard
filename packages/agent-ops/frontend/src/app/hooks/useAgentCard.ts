import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getAgentCard } from '~/app/api/agentRuntimes';
import { AGENT_RUNTIMES_REFRESH_INTERVAL, NO_REFRESH_INTERVAL } from '~/app/const';
import { AgentCard } from '~/app/types/agentCard';

export const useAgentCard = (
  namespace?: string,
  name?: string,
  refreshInterval = AGENT_RUNTIMES_REFRESH_INTERVAL,
): FetchState<AgentCard | null> => {
  const hasParams = !!namespace && !!name;

  const callback = React.useCallback<FetchStateCallbackPromise<AgentCard | null>>(
    (opts: APIOptions) => {
      if (!namespace || !name) {
        return Promise.resolve(null);
      }
      return getAgentCard('')(opts, namespace, name);
    },
    [namespace, name],
  );

  return useFetchState<AgentCard | null>(callback, null, {
    refreshRate: hasParams ? refreshInterval : NO_REFRESH_INTERVAL,
  });
};
