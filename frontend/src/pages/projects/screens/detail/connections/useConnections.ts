import * as React from 'react';
import { getSecretsByLabel } from '~/api';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { Connection, isConnection } from '~/concepts/connectionTypes/types';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE, LABEL_SELECTOR_DATA_CONNECTION_AWS } from '~/const';

const useConnections = (namespace?: string): FetchState<Connection[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<Connection[]>>(
    (opts) => {
      if (!namespace) {
        return Promise.reject(new NotReadyError('No namespace'));
      }

      return getSecretsByLabel(
        `${LABEL_SELECTOR_DASHBOARD_RESOURCE},${LABEL_SELECTOR_DATA_CONNECTION_AWS}`,
        namespace,
        opts,
      ).then((secrets) => secrets.filter((secret) => isConnection(secret)));
    },
    [namespace],
  );

  return useFetchState(callback, []);
};

export default useConnections;
