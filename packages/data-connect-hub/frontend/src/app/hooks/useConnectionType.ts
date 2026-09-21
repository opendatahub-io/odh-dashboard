import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getConnectionType } from '~/app/api/dch';
import { ConnectionType } from '~/app/types';

export const useConnectionType = (
  namespace: string,
  connectionTypeId: string,
  fetchEnabled = true,
): [ConnectionType | undefined, boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<ConnectionType | undefined>>(
    (opts: APIOptions) =>
      namespace && fetchEnabled
        ? getConnectionType('')(opts, namespace, connectionTypeId)
        : Promise.resolve(undefined),
    [connectionTypeId, fetchEnabled, namespace],
  );

  const [connectionType, loaded, error] = useFetchState<ConnectionType | undefined>(
    callback,
    undefined,
    {
      initialPromisePurity: true,
    },
  );
  return [connectionType, loaded, error];
};
