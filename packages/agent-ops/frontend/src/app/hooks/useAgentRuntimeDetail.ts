import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getAgentRuntimeDetail } from '~/app/api/agentRuntimes';
import { NO_REFRESH_INTERVAL } from '~/app/const';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';

export const useAgentRuntimeDetail = (
  namespace?: string,
  name?: string,
): FetchState<AgentRuntimeDetail | undefined> => {
  const callback = React.useCallback<FetchStateCallbackPromise<AgentRuntimeDetail | undefined>>(
    (opts: APIOptions) => {
      if (!namespace || !name) {
        return Promise.resolve(undefined);
      }
      return getAgentRuntimeDetail('', namespace, name)(opts);
    },
    [namespace, name],
  );

  return useFetchState<AgentRuntimeDetail | undefined>(callback, undefined, {
    refreshRate: NO_REFRESH_INTERVAL,
  });
};
