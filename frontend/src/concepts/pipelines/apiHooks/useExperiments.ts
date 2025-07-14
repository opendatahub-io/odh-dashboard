import * as React from 'react';
import { ExperimentKF, PipelinesFilterOp, StorageStateKF } from '#~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import usePipelineQuery from '#~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '#~/concepts/pipelines/types';
import { FetchState } from '#~/utilities/useFetchState';

const useExperimentsByStorageState = (
  options?: PipelineOptions,
  storageState?: StorageStateKF,
): FetchState<PipelineListPaged<ExperimentKF>> => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<ExperimentKF>(
    React.useCallback(
      (opts, params) => {
        const predicates = params?.filter?.predicates || [];
        if (storageState) {
          predicates.push({
            key: 'storage_state',
            operation: PipelinesFilterOp.EQUALS,
            // eslint-disable-next-line camelcase
            string_value: storageState,
          });
        }
        return api
          .listExperiments(opts, {
            ...params,
            filter: { predicates },
          })
          .then((result) => ({ ...result, items: result.experiments }));
      },
      [api, storageState],
    ),
    options,
  );
};

const useExperiments = (options?: PipelineOptions): FetchState<PipelineListPaged<ExperimentKF>> =>
  useExperimentsByStorageState(options);

export const useActiveExperiments = (
  options?: PipelineOptions,
): FetchState<PipelineListPaged<ExperimentKF>> => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<ExperimentKF>(
    React.useCallback(
      (opts, params) =>
        api
          .listActiveExperiments(opts, params)
          .then((result) => ({ ...result, items: result.experiments })),
      [api],
    ),
    options,
  );
};

export const useArchivedExperiments = (
  options?: PipelineOptions,
): FetchState<PipelineListPaged<ExperimentKF>> =>
  useExperimentsByStorageState(options, StorageStateKF.ARCHIVED);

export default useExperiments;
