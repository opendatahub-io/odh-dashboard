import {
  APIOptions,
  FetchStateCallbackPromise,
  FetchStateRefreshPromise,
  useFetchState,
} from 'mod-arch-core';
import React from 'react';
import { getConnection } from '~/app/api/dch';
import { Connection } from '~/app/types';

export const useConnection = (
  namespace: string,
  connectionId: string,
  fetchEnabled = true,
): [Connection | null, boolean, Error | undefined, FetchStateRefreshPromise<Connection | null>] => {
  const callback = React.useCallback<FetchStateCallbackPromise<Connection | null>>(
    async (opts: APIOptions) => {
      if (!namespace || !fetchEnabled) {
        return null;
      }

      return getConnection('')(opts, namespace, connectionId);
    },
    [connectionId, fetchEnabled, namespace],
  );

  const [connection, loaded, error, refresh] = useFetchState<Connection | null>(callback, null, {
    initialPromisePurity: true,
  });
  return [connection, loaded, error, refresh];
};
