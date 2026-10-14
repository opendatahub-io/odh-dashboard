import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getConnection } from '~/app/api/dch';
import { Connection } from '~/app/types';

export const useConnection = (
  namespace: string,
  connectionId: string,
  fetchEnabled = true,
): [Connection | undefined, boolean, Error | undefined, () => void] => {
  const callback = React.useCallback<FetchStateCallbackPromise<Connection | undefined>>(
    async (opts: APIOptions) => {
      if (!namespace || !fetchEnabled) {
        return undefined;
      }

      return getConnection('')(opts, namespace, connectionId);
    },
    [connectionId, fetchEnabled, namespace],
  );

  const [connection, loaded, error, refresh] = useFetchState<Connection | undefined>(
    callback,
    undefined,
    {
      initialPromisePurity: true,
    },
  );
  return [connection, loaded, error, refresh];
};
