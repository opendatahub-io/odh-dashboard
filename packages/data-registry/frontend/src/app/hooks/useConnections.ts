import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getConnections } from '~/app/api/k8s';
import { ConnectionModel } from '~/app/types';

export const useConnections = (
  namespace: string,
): [ConnectionModel[], boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<ConnectionModel[]>>(
    (opts: APIOptions) => {
      if (!namespace) {
        return Promise.resolve([]);
      }
      return getConnections('')(opts, namespace);
    },
    [namespace],
  );
  const [connections, loaded, error] = useFetchState<ConnectionModel[]>(callback, []);

  return [connections, loaded, error];
};
