import * as React from 'react';
import { getServingRuntimeContext } from '~/api';
import { ServingRuntimeKind } from '~/k8sTypes';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useServingRuntimes = (
  namespace?: string,
  notReady?: boolean,
): FetchState<ServingRuntimeKind[]> => {
  const modelServingEnabled = useModelServingEnabled();

  const getServingRuntimes = React.useCallback(() => {
    if (!modelServingEnabled) {
      return Promise.reject(new NotReadyError('Model serving is not enabled'));
    }

    if (notReady) {
      return Promise.reject(new NotReadyError('Fetch is not ready'));
    }

    return getServingRuntimeContext(namespace, 'opendatahub.io/dashboard=true').catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error('Model serving is not properly configured.');
      }
      throw e;
    });
  }, [namespace, modelServingEnabled, notReady]);

  return useFetchState<ServingRuntimeKind[]>(getServingRuntimes, []);
};

export default useServingRuntimes;
