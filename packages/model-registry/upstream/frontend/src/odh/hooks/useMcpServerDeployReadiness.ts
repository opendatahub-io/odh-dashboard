import React from 'react';
import {
  useFetchState,
  useQueryParamNamespaces,
  APIOptions,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
  POLL_INTERVAL,
} from 'mod-arch-core';
import { getMcpServerDeployReadiness } from '~/odh/api/mcpCatalogDeployment/service';
import { McpServerDeployReadiness } from '~/odh/types/mcpDeploymentTypes';

/**
 * Fetches the deploy prerequisites for a catalog MCP server. While a server is not deployable (or
 * the check fails) it re-checks on an interval, so Deploy becomes available without a page
 * reload once an administrator sets up the missing prerequisite. Servers that don't require
 * a gateway are never polled.
 *
 * @deprecated RHOAI 3.6 stopgap: the BFF hardcodes which server needs an MCP gateway.
 * Replace with catalog metadata that declares deploy prerequisites; do not reuse for other
 * servers.
 */
const useMcpServerDeployReadiness = (
  serverId: string,
): FetchState<McpServerDeployReadiness | null> => {
  // The model registries namespace is required by the BFF for catalog API calls
  const queryParams = useQueryParamNamespaces();
  const [shouldPoll, setShouldPoll] = React.useState(false);

  const callback = React.useCallback<FetchStateCallbackPromise<McpServerDeployReadiness>>(
    (opts: APIOptions) => {
      if (!serverId) {
        return Promise.reject(new NotReadyError('No server id'));
      }
      // A superseded (aborted) request must not change polling for the current server.
      return getMcpServerDeployReadiness('', queryParams)(opts, serverId).then(
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
    [serverId, queryParams],
  );

  return useFetchState<McpServerDeployReadiness | null>(callback, null, {
    initialPromisePurity: true,
    refreshRate: shouldPoll ? POLL_INTERVAL : undefined,
  });
};

export default useMcpServerDeployReadiness;
