import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getConnections } from '~/app/api/dch';
import { POLL_INTERVAL } from '~/app/utilities/const';
import { Connection } from '~/app/types';

export const useConnections = (
  namespace: string,
): [Connection[], boolean, Error | undefined, () => void] => {
  const callback = React.useCallback<FetchStateCallbackPromise<Connection[]>>(
    (opts: APIOptions) => (namespace ? getConnections('')(opts, namespace) : Promise.resolve([])),
    [namespace],
  );

  const [connections, loaded, error, refresh] = useFetchState<Connection[]>(callback, [], {
    refreshRate: POLL_INTERVAL,
  });
  return [connections, loaded, error, refresh];
};
