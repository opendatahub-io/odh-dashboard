import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getConnections } from '~/app/api/dch';
import { ConnectionTypeInstance } from '~/app/components/ConnectionType';
import { POLL_INTERVAL } from '~/app/utilities/const';
import { Connection } from '~/app/types';

type ResolvedConnection = Connection & {
  resource: { data_connection_type?: ConnectionTypeInstance };
};

type ConnectionsState<T extends Connection> = [T[], boolean, Error | undefined, () => void];

export function useConnections(
  namespace: string,
  pollingEnabled: boolean | undefined,
  options: { resolveConnectionTypes: true },
): ConnectionsState<ResolvedConnection>;
export function useConnections(
  namespace: string,
  pollingEnabled?: boolean,
  options?: { resolveConnectionTypes: boolean },
): ConnectionsState<Connection>;
export function useConnections(
  namespace: string,
  pollingEnabled = true,
  options?: { resolveConnectionTypes: boolean },
): ConnectionsState<Connection> {
  const resolveConnectionTypes = options?.resolveConnectionTypes ?? false;
  const callback = React.useCallback<FetchStateCallbackPromise<Connection[]>>(
    async (opts: APIOptions) => {
      if (!namespace || !pollingEnabled) {
        return [];
      }
      const connections = await getConnections('')(opts, namespace, { resolveConnectionTypes });
      return resolveConnectionTypes
        ? connections.map((connection) => ({
            ...connection,
            resource: {
              ...connection.resource,
              data_connection_type: connection.resource.data_connection_type
                ? new ConnectionTypeInstance(connection.resource.data_connection_type)
                : undefined,
            },
          }))
        : connections;
    },
    [namespace, pollingEnabled, resolveConnectionTypes],
  );

  // Resolving types adds an upstream lookup on each poll.
  const refreshRate = resolveConnectionTypes ? Math.max(POLL_INTERVAL, 60000) : POLL_INTERVAL;
  const [connections, loaded, error, refresh] = useFetchState<Connection[]>(callback, [], {
    refreshRate: pollingEnabled ? refreshRate : 0,
    initialPromisePurity: true,
  });
  return [connections, loaded, error, refresh];
}
