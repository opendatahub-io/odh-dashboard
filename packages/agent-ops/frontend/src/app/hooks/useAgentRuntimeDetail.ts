import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getAgentRuntimeDetail } from '~/app/api/agentRuntimes';
import {
  AGENT_RUNTIMES_REFRESH_INTERVAL,
  NO_REFRESH_INTERVAL,
} from '~/app/const';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';

export const useAgentRuntimeDetail = (
  namespace?: string,
  name?: string,
  refreshInterval = AGENT_RUNTIMES_REFRESH_INTERVAL,
): FetchState<AgentRuntimeDetail | null> => {
  const hasParams = !!namespace && !!name;

  const callback = React.useCallback<FetchStateCallbackPromise<AgentRuntimeDetail | null>>(
    (opts: APIOptions) => {
      if (!namespace || !name) {
        return Promise.resolve(null);
      }
      return getAgentRuntimeDetail('')(opts, namespace, name);
    },
    [namespace, name],
  );

  return useFetchState<AgentRuntimeDetail | null>(callback, null, {
    refreshRate: hasParams ? refreshInterval : NO_REFRESH_INTERVAL,
  });
};
