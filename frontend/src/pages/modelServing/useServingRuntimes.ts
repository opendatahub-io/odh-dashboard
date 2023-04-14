import * as React from 'react';
import { getServingRuntimeContext } from '~/api';
import { ServingRuntimeKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';

const useServingRuntimes = (namespace?: string): FetchState<ServingRuntimeKind[]> => {
  const getServingRuntimes = React.useCallback(
    () =>
      getServingRuntimeContext(namespace, LABEL_SELECTOR_DASHBOARD_RESOURCE).catch((e) => {
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
