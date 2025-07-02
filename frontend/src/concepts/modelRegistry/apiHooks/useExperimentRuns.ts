import * as React from 'react';
import {
  useFetchState,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from 'mod-arch-shared';
import { ModelRegistryQueryParams, RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useExperimentRuns = (
  experimentId?: string,
  params?: ModelRegistryQueryParams,
): FetchState<RegistryExperimentRun[]> => {
  const { api, apiAvailable } = useModelRegistryAPI();
  const callback = React.useCallback<FetchStateCallbackPromise<RegistryExperimentRun[]>>(
    async (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!experimentId) {
        return Promise.reject(new NotReadyError('No experiment id'));
      }

      // Fetch all pages iteratively
      let allItems: RegistryExperimentRun[] = [];
      let nextPageToken: string | undefined;

      do {
        const currentParams = {
          ...params,
          ...(nextPageToken && { nextPageToken }),
        };

        const response = await api.getExperimentRuns(opts, experimentId, currentParams);

        allItems = allItems.concat(response.items);
        nextPageToken = response.nextPageToken;

        // Break if no more pages or no items
        if (!nextPageToken || response.items.length === 0) {
          break;
        }
      } while (nextPageToken);

      return allItems;
    },
    [api, apiAvailable, experimentId, params],
  );
  return useFetchState(callback, [], { initialPromisePurity: true });
};

export default useExperimentRuns;
