import * as React from 'react';
import { getServingRuntimeContext } from '~/api';
import { ServingRuntimeKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useServingRuntimes = (namespace?: string): FetchState<ServingRuntimeKind[]> => {
  const getServingRuntimes = React.useCallback(
    () =>
      getServingRuntimeContext(namespace, 'opendatahub.io/dashboard=true').catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('Model serving is not properly configured.');
        }
        throw e;
      }),
    [namespace],
  );

  return useFetchState<ServingRuntimeKind[]>(getServingRuntimes, []);
};

export default useServingRuntimes;
