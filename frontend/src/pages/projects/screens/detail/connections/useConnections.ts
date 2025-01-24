import * as React from 'react';
import { getSecretsByLabel } from '~/api';
import useFetchState, {
  FetchOptions,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { Connection } from '~/concepts/connectionTypes/types';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';
import { isConnection } from '~/concepts/connectionTypes/utils';

const useConnections = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchState<Connection[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<Connection[]>>(
    async (opts) => {
      if (!namespace) {
        return Promise.reject(new NotReadyError('No namespace'));
      }

      const secrets = await getSecretsByLabel(
        `${LABEL_SELECTOR_DASHBOARD_RESOURCE}`,
        namespace,
        opts,
      );
      const connections = secrets.filter((secret) => isConnection(secret));

      return connections;
    },
    [namespace],
  );

  return useFetchState(callback, [], fetchOptions);
};

export default useConnections;
