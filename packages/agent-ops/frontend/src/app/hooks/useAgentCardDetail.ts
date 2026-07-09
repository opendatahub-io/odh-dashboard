import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getAgentCard } from '~/app/api/agentRuntimes';
import { NO_REFRESH_INTERVAL } from '~/app/const';
import { AgentCardDetail } from '~/app/types/agentRuntimes';

export const useAgentCardDetail = (
  namespace?: string,
  name?: string,
): FetchState<AgentCardDetail | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<AgentCardDetail | null>>(
    (opts: APIOptions) => {
      if (!namespace || !name) {
        return Promise.resolve(null);
      }
      return getAgentCard('')(namespace, name, opts);
    },
    [namespace, name],
  );

  return useFetchState<AgentCardDetail | null>(callback, null, {
    refreshRate: NO_REFRESH_INTERVAL,
  });
};
