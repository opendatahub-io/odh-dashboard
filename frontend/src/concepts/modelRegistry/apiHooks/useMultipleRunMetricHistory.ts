import * as React from 'react';
import {
  useFetchState,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from 'mod-arch-shared';
import { RegistryArtifactList, RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

type MultipleRunMetricHistoryResult = {
  [runId: string]: {
    run: RegistryExperimentRun;
    metricHistory: RegistryArtifactList;
    error?: Error;
  };
};

const useMultipleRunMetricHistory = (
  experimentRuns: RegistryExperimentRun[],
  metricName?: string,
): FetchState<MultipleRunMetricHistoryResult> => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const callback = React.useCallback<FetchStateCallbackPromise<MultipleRunMetricHistoryResult>>(
    async (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!experimentRuns.length) {
        return Promise.reject(new NotReadyError('No experiment runs'));
      }
      if (!metricName) {
        return Promise.reject(new NotReadyError('No metric name provided'));
      }

      // Fetch metric history for all runs in parallel
      const promises = experimentRuns.map(async (run) => {
        try {
          const metricHistory = await api.getExperimentRunMetricHistory(opts, run.id, metricName);
          return {
            runId: run.id,
            result: { run, metricHistory, error: undefined },
          };
        } catch (error) {
          return {
            runId: run.id,
            result: {
              run,
              metricHistory: { items: [], size: 0, pageSize: 0, nextPageToken: '' },
              error: error instanceof Error ? error : new Error(String(error)),
            },
          };
        }
      });

      const results = await Promise.all(promises);

      // Convert array to object keyed by runId
      const resultMap: MultipleRunMetricHistoryResult = {};
      results.forEach(({ runId, result }) => {
        resultMap[runId] = result;
      });

      return resultMap;
    },
    [api, apiAvailable, experimentRuns, metricName],
  );

  return useFetchState(callback, {}, { initialPromisePurity: true });
};

export default useMultipleRunMetricHistory;
