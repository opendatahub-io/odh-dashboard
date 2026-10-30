import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getConnections } from '~/app/api/dch';
import { POLL_INTERVAL } from '~/app/utilities/const';
import { Connection } from '~/app/types';

export const useConnections = (
  namespace: string,
  pollingEnabled = true,
): [Connection[], boolean, Error | undefined, () => void] => {
  const callback = React.useCallback<FetchStateCallbackPromise<Connection[]>>(
    (opts: APIOptions) =>
      namespace && pollingEnabled ? getConnections('')(opts, namespace) : Promise.resolve([]),
    [namespace, pollingEnabled],
  );

  const [connections, loaded, error, refresh] = useFetchState<Connection[]>(callback, [], {
    refreshRate: pollingEnabled ? POLL_INTERVAL : 0,
    initialPromisePurity: true,
  });
  return [connections, loaded, error, refresh];
};
