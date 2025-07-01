import * as React from 'react';
import {
  useFetchState,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from 'mod-arch-shared';
import { RegistryExperiment } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useExperimentById = (experimentId?: string): FetchState<RegistryExperiment | null> => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const call = React.useCallback<FetchStateCallbackPromise<RegistryExperiment | null>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!experimentId) {
        return Promise.reject(new NotReadyError('No experiment id'));
      }

      return api.getExperiment(opts, experimentId);
    },
    [api, apiAvailable, experimentId],
  );

  return useFetchState(call, null);
};

export default useExperimentById;
