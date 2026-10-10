import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getConnections } from '~/app/api/k8s';
import { ConnectionModel, ConnectionWarning, ConnectionsResponse } from '~/app/types';

const EMPTY: ConnectionsResponse = { data: [] };
const NO_WARNINGS: ConnectionWarning[] = [];

export const useConnections = (
  namespace: string,
  enabled = true,
): [
  ConnectionModel[],
  boolean,
  Error | undefined,
  () => Promise<ConnectionModel[]>,
  ConnectionWarning[],
  ConnectionModel[]?,
] => {
  const callback = React.useCallback<FetchStateCallbackPromise<ConnectionsResponse>>(
    (opts: APIOptions) => {
      if (!namespace || !enabled) {
        return Promise.resolve(EMPTY);
      }
      return getConnections('')(opts, namespace);
    },
    [namespace, enabled],
  );
  const [result, loaded, error, refresh] = useFetchState(callback, EMPTY, {
    initialPromisePurity: true,
  });
  const refreshConnections = React.useCallback(async () => {
    const response = await refresh();
    if (!response) {
      throw new Error(
        'Unable to confirm the selected connection. Reload connections and try again.',
      );
    }
    return response.data;
  }, [refresh]);

  return [
    error ? [] : result.data,
    loaded,
    error,
    refreshConnections,
    error ? NO_WARNINGS : (result.metadata?.warnings ?? NO_WARNINGS),
    error ? [] : [...result.data, ...(result.metadata?.rhaiConnections ?? [])],
  ];
};
