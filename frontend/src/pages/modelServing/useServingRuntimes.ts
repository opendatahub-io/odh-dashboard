import * as React from 'react';
import { listServingRuntimes } from '~/api';
import { ServingRuntimeKind } from '~/k8sTypes';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';

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

    return listServingRuntimes(namespace, LABEL_SELECTOR_DASHBOARD_RESOURCE).catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error('Model serving is not properly configured.');
      }
      throw e;
    });
  }, [namespace, modelServingEnabled, notReady]);

  return useFetchState<ServingRuntimeKind[]>(getServingRuntimes, []);
};

export default useServingRuntimes;
