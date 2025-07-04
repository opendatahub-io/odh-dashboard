import * as React from 'react';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import { RegistryArtifactList } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';
import { allSettledPromises } from '#~/utilities/allSettledPromises';

const useExperimentRunsArtifactsMetrics = (
  experimentRunIds?: Array<string>,
): FetchState<RegistryArtifactList[]> => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const fetchSuccessfulRuns = React.useCallback<FetchStateCallbackPromise<RegistryArtifactList[]>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!experimentRunIds || experimentRunIds.length === 0) {
        return Promise.resolve([]);
      }
      return allSettledPromises(
        experimentRunIds.map((id) => api.getExperimentRunArtifacts(opts, id)),
      ).then(([successful]) =>
        successful.map(({ value }: { value: RegistryArtifactList }) => value),
      );
    },
    [api, experimentRunIds, apiAvailable],
  );

  return useFetchState(fetchSuccessfulRuns, []);
};

export default useExperimentRunsArtifactsMetrics;
