import * as React from 'react';
import useFetch, { NotReadyError } from '@odh-dashboard/internal/utilities/useFetch';

import { getClusterTrainingRuntime } from '../api';
import { ClusterTrainingRuntimeKind } from '../k8sTypes';

type UseClusterTrainingRuntimeResult = {
  clusterTrainingRuntime: ClusterTrainingRuntimeKind | null;
  loaded: boolean;
  error: Error | undefined;
};

/**
 * Hook to get a specific ClusterTrainingRuntime by name
 * @param runtimeName - The name of the ClusterTrainingRuntime
 * @returns Object containing ClusterTrainingRuntime data, loading state, and error
 */
const useClusterTrainingRuntime = (
  runtimeName?: string | null,
): UseClusterTrainingRuntimeResult => {
  const {
    data: clusterTrainingRuntime,
    loaded: clusterTrainingRuntimeLoaded,
    error: clusterTrainingRuntimeError,
  } = useFetch<ClusterTrainingRuntimeKind | null>(
    React.useCallback(() => {
      if (!runtimeName) {
        return Promise.reject(new NotReadyError('Missing ClusterTrainingRuntime name'));
      }
      return getClusterTrainingRuntime(runtimeName);
    }, [runtimeName]),
    null,
    { initialPromisePurity: true },
  );

  return {
    clusterTrainingRuntime,
    loaded: clusterTrainingRuntimeLoaded,
    error: clusterTrainingRuntimeError,
  };
};

export default useClusterTrainingRuntime;
