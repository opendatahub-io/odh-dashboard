import * as React from 'react';
import {
  useFetchState,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from 'mod-arch-shared';
import { RegistryExperimentRunList } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useExperimentRuns = (experimentId?: string): FetchState<RegistryExperimentRunList> => {
  const { api, apiAvailable } = useModelRegistryAPI();
  const callback = React.useCallback<FetchStateCallbackPromise<RegistryExperimentRunList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!experimentId) {
        return Promise.reject(new NotReadyError('No experiment id'));
      }
      return api.getExperimentRuns(opts, experimentId);
    },
    [api, apiAvailable, experimentId],
  );
  return useFetchState(
    callback,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );
};

export default useExperimentRuns;
