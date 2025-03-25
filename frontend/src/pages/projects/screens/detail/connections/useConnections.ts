import * as React from 'react';
import { getSecretsByLabel } from '~/api';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { Connection } from '~/concepts/connectionTypes/types';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';
import {
  isConnection,
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '~/concepts/connectionTypes/utils';

const useConnections = (
  namespace?: string,
  modelServingCompatible?: boolean,
  pipelinesCompatible?: boolean,
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
      if (pipelinesCompatible) {
        connections = connections.filter((c) =>
          isModelServingCompatible(c, ModelServingCompatibleTypes.S3ObjectStorage),
        );
      }

      return connections;
    },
    [namespace, modelServingCompatible, pipelinesCompatible],
  );

  return useFetchState(callback, []);
};

export default useConnections;
