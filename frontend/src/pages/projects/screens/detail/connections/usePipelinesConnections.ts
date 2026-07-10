import React from 'react';
import { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { Connection } from '#~/concepts/connectionTypes/types';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '#~/concepts/connectionTypes/utils';
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
