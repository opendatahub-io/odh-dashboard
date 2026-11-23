import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { getConnectionTypes } from '~/app/api/dch';
import { ConnectionTypeInstance } from '~/app/components/ConnectionType';

export const useConnectionTypes = (
  namespace: string,
  fetchEnabled = true,
): [ConnectionTypeInstance[], boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<ConnectionTypeInstance[]>>(
    async (opts: APIOptions) => {
      if (!namespace || !fetchEnabled) {
        return [];
      }

      const connectionTypes = await getConnectionTypes('')(opts, namespace);
      return connectionTypes.map((connectionType) => new ConnectionTypeInstance(connectionType));
    },
    [fetchEnabled, namespace],
  );

  const [connectionTypes, loaded, error] = useFetchState<ConnectionTypeInstance[]>(callback, [], {
    initialPromisePurity: true,
  });
  return [connectionTypes, loaded, error];
};
