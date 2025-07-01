import * as React from 'react';
import {
  useFetchState,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from 'mod-arch-shared';
import { RegistryArtifactList } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useExperimentRunMetricHistory = (
  experimentRunId?: string,
  metricName?: string,
): FetchState<RegistryArtifactList> => {
  const { api, apiAvailable } = useModelRegistryAPI();
  const callback = React.useCallback<FetchStateCallbackPromise<RegistryArtifactList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!experimentRunId) {
        return Promise.reject(new NotReadyError('No experiment run id'));
      }
      return api.getExperimentRunMetricHistory(opts, experimentRunId, metricName);
    },
    [api, apiAvailable, experimentRunId, metricName],
  );
  return useFetchState(
    callback,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );
};

export default useExperimentRunMetricHistory;
