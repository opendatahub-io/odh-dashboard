import * as React from 'react';
import { getAllSecretsByLabel, getSecretsByLabel } from '~/api';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { Connection } from '~/concepts/connectionTypes/types';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';
import { isConnection, isModelServingCompatibleConnection } from '~/concepts/connectionTypes/utils';

const useConnections = (
  namespace?: string,
  modelServingCompatible?: boolean,
  allowAll?: boolean,
): FetchState<Connection[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<Connection[]>>(
    async (opts) => {
      if (!namespace && !allowAll) {
        return Promise.reject(new NotReadyError('No namespace'));
      }

      const secrets = namespace
        ? await getSecretsByLabel(`${LABEL_SELECTOR_DASHBOARD_RESOURCE}`, namespace, opts)
        : await getAllSecretsByLabel(`${LABEL_SELECTOR_DASHBOARD_RESOURCE}`, opts);
      let connections = secrets.filter((secret) => isConnection(secret));

      if (modelServingCompatible) {
        connections = connections.filter(isModelServingCompatibleConnection);
      }

      return connections;
    },
    [namespace, modelServingCompatible, allowAll],
  );

  return useFetchState(callback, []);
};

export default useConnections;
