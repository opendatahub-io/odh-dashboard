import React from 'react';
import { Connection } from '#~/concepts/connectionTypes/types';
import { isModelServingCompatible } from '#~/concepts/connectionTypes/utils';
import { FetchState } from '#~/utilities/useFetchState';
import useConnections from './useConnections';

const useServingConnections = (namespace?: string): FetchState<Connection[]> => {
  const { data: connections, loaded, error, refresh } = useConnections(namespace);

  return React.useMemo(
    () => [connections.filter((c) => isModelServingCompatible(c)), loaded, error, refresh],
    [connections, loaded, error, refresh],
  );
};

export default useServingConnections;
