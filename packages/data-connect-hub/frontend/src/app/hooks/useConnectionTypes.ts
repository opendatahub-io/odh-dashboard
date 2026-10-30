import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getConnectionTypes } from '~/app/api/dch';
import { ConnectionType } from '~/app/types';

export const useConnectionTypes = (
  namespace: string,
  fetchEnabled = true,
): [ConnectionType[], boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<ConnectionType[]>>(
    (opts: APIOptions) =>
      namespace && fetchEnabled ? getConnectionTypes('')(opts, namespace) : Promise.resolve([]),
    [fetchEnabled, namespace],
  );

  const [connectionTypes, loaded, error] = useFetchState<ConnectionType[]>(callback, [], {
    initialPromisePurity: true,
  });
  return [connectionTypes, loaded, error];
};
