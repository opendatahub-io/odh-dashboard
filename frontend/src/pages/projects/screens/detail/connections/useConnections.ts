import * as React from 'react';
import { getSecretsByLabel } from '~/api';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { Connection } from '~/concepts/connectionTypes/types';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';
import { isConnection, isModelServingCompatible } from '~/concepts/connectionTypes/utils';

const useConnections = (
  namespace?: string,
  modelServingCompatible?: boolean,
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
      let connections = secrets.filter((secret) => isConnection(secret));

      if (modelServingCompatible) {
        connections = connections.filter((c) => isModelServingCompatible(c));
      }

      return connections;
    },
    [namespace, modelServingCompatible],
  );

  return useFetchState(callback, []);
};

export default useConnections;
