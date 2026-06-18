import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { listAgentRuntimes } from '~/app/api/agentRuntimes';
import { NO_REFRESH_INTERVAL } from '~/app/const';
import { AgentRuntime } from '~/app/types/agentRuntimes';

/**
 * Fetches agent runtimes for the deployments list. Polling is added in a follow-up PR
 * (RHOAIENG-62705); this hook loads once per namespace change.
 */
export const useListAgentRuntimes = (namespace?: string): FetchState<AgentRuntime[]> => {
  const hasNamespace = !!namespace;

  const callback = React.useCallback<FetchStateCallbackPromise<AgentRuntime[]>>(
    (opts: APIOptions) =>
      listAgentRuntimes('')(opts).then((runtimes) =>
        hasNamespace ? runtimes.filter((runtime) => runtime.namespace === namespace) : runtimes,
      ),
    [hasNamespace, namespace],
  );

  return useFetchState<AgentRuntime[]>(callback, [], {
    refreshRate: NO_REFRESH_INTERVAL,
  });
};
