import React from 'react';
import {
  useFetchState,
  APIOptions,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
  POLL_INTERVAL,
} from 'mod-arch-core';
import { McpServerDeployReadiness } from '~/odh/types/mcpDeploymentTypes';

/**
 * Fetches MCP deploy readiness and, while the server is not deployable (or the check fails),
 * re-checks on an interval, so Deploy becomes available without a page reload once an
 * administrator sets up the missing prerequisite. Deployable results are not polled.
 *
 * Pass a memoized `fetchReadiness`, or `undefined` while its inputs are not ready.
 *
 * @deprecated RHOAI 3.6 stopgap: the BFF hardcodes which server needs an MCP gateway.
 * Replace with catalog metadata that declares deploy prerequisites.
 */
const usePolledMcpDeployReadiness = (
  fetchReadiness: ((opts: APIOptions) => Promise<McpServerDeployReadiness>) | undefined,
): FetchState<McpServerDeployReadiness | null> => {
  const [shouldPoll, setShouldPoll] = React.useState(false);

  const callback = React.useCallback<FetchStateCallbackPromise<McpServerDeployReadiness>>(
    (opts: APIOptions) => {
      if (!fetchReadiness) {
        return Promise.reject(new NotReadyError('Deploy readiness inputs are not ready'));
      }
      // A superseded (aborted) request must not change polling for the current target.
      return fetchReadiness(opts).then(
        (readiness) => {
          if (!opts.signal?.aborted) {
            setShouldPoll(!readiness.deployable);
          }
          return readiness;
        },
        (error) => {
          if (!opts.signal?.aborted) {
            setShouldPoll(true);
          }
          throw error;
        },
      );
    },
    [fetchReadiness],
  );

  return useFetchState<McpServerDeployReadiness | null>(callback, null, {
    initialPromisePurity: true,
    refreshRate: shouldPoll ? POLL_INTERVAL : undefined,
  });
};

export default usePolledMcpDeployReadiness;
