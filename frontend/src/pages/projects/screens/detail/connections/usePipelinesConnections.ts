import React from 'react';
import { Connection } from '~/concepts/connectionTypes/types';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '~/concepts/connectionTypes/utils';
import { FetchState } from '~/utilities/useFetchState';
import useConnections from './useConnections';

const usePipelinesConnections = (namespace?: string): FetchState<Connection[]> => {
  const { data: connections, loaded, error, refresh } = useConnections(namespace);

  return React.useMemo(
    () => [
      connections.filter((c) =>
        isModelServingCompatible(c, ModelServingCompatibleTypes.S3ObjectStorage),
      ),
      loaded,
      error,
      refresh,
    ],
    [connections, loaded, error, refresh],
  );
};

export default usePipelinesConnections;
