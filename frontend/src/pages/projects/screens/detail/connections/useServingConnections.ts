import React from 'react';
import { Connection } from '#~/concepts/connectionTypes/types';
import { isModelServingCompatible } from '#~/concepts/connectionTypes/utils';
import { FetchState } from '#~/utilities/useFetchState';
import useConnections from './useConnections';

const useServingConnections = (
  namespace?: string,
  includeDashboardFalse = false,
  skipCompatibilityCheck = false,
): FetchState<Connection[]> => {
  const {
    data: connections,
    loaded,
    error,
    refresh,
  } = useConnections(namespace, undefined, includeDashboardFalse);
  return React.useMemo(
    () => [
      connections.filter((c) => skipCompatibilityCheck || isModelServingCompatible(c)),
      loaded,
      error,
      refresh,
    ],
    [connections, loaded, error, refresh],
  );
};

export default useServingConnections;
