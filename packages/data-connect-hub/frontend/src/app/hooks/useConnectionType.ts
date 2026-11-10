import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getConnectionType } from '~/app/api/dch';
import { ConnectionTypeInstance } from '~/app/components/ConnectionType';

export const useConnectionType = (
  namespace: string,
  connectionTypeId: string,
  fetchEnabled = true,
): [ConnectionTypeInstance | undefined, boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<ConnectionTypeInstance | undefined>>(
    async (opts: APIOptions) => {
      if (!namespace || !fetchEnabled) {
        return undefined;
      }

      const connectionType = await getConnectionType('')(opts, namespace, connectionTypeId);
      return new ConnectionTypeInstance(connectionType);
    },
    [connectionTypeId, fetchEnabled, namespace],
  );

  const [connectionType, loaded, error] = useFetchState<ConnectionTypeInstance | undefined>(
    callback,
    undefined,
    {
      initialPromisePurity: true,
    },
  );
  return [connectionType, loaded, error];
};
