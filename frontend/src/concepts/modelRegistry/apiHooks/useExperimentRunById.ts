import * as React from 'react';
import {
  useFetchState,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from 'mod-arch-shared';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useExperimentRunById = (
  experimentRunId?: string,
): FetchState<RegistryExperimentRun | null> => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const call = React.useCallback<FetchStateCallbackPromise<RegistryExperimentRun | null>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!experimentRunId) {
        return Promise.reject(new NotReadyError('No experiment run id'));
      }

      return api.getExperimentRun(opts, experimentRunId);
    },
    [api, apiAvailable, experimentRunId],
  );

  return useFetchState(call, null);
};

export default useExperimentRunById;
