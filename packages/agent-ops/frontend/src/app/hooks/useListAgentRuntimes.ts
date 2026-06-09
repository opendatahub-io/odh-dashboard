import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { listAgentRuntimes } from '~/app/api/agentRuntimes';
import {
  AGENT_RUNTIMES_REFRESH_INTERVAL,
  NO_REFRESH_INTERVAL,
} from '~/app/const';
import { AgentRuntime } from '~/app/types/agentRuntimes';

export const useListAgentRuntimes = (
  namespace?: string,
  refreshInterval = AGENT_RUNTIMES_REFRESH_INTERVAL,
): FetchState<AgentRuntime[]> => {
  const hasNamespace = !!namespace;

  const callback = React.useCallback<FetchStateCallbackPromise<AgentRuntime[]>>(
    (opts: APIOptions) =>
      listAgentRuntimes('')(opts).then((runtimes) =>
        hasNamespace ? runtimes.filter((runtime) => runtime.namespace === namespace) : runtimes,
      ),
    [hasNamespace, namespace],
  );

  return useFetchState<AgentRuntime[]>(callback, [], {
    refreshRate: hasNamespace ? refreshInterval : NO_REFRESH_INTERVAL,
  });
};
