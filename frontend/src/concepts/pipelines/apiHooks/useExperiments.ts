import * as React from 'react';
import { ExperimentKFv2, PipelinesFilterOp, StorageStateKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';
import { FetchState } from '~/utilities/useFetchState';

const useExperimentsByStorageState = (
  options?: PipelineOptions,
  storageState?: StorageStateKF,
): FetchState<PipelineListPaged<ExperimentKFv2>> => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<ExperimentKFv2>(
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

const useExperiments = (options?: PipelineOptions): FetchState<PipelineListPaged<ExperimentKFv2>> =>
  useExperimentsByStorageState(options);

export const useActiveExperiments = (
  options?: PipelineOptions,
): FetchState<PipelineListPaged<ExperimentKFv2>> =>
  useExperimentsByStorageState(options, StorageStateKF.AVAILABLE);

export const useArchivedExperiments = (
  options?: PipelineOptions,
): FetchState<PipelineListPaged<ExperimentKFv2>> =>
  useExperimentsByStorageState(options, StorageStateKF.ARCHIVED);

export default useExperiments;
