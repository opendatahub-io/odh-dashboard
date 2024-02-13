import * as React from 'react';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';
import { FetchState } from '~/utilities/useFetchState';

const useExperiments = (options?: PipelineOptions): FetchState<PipelineListPaged<ExperimentKF>> => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<ExperimentKF>(
    React.useCallback(
      (opts, params) =>
        api
          .listExperiments(opts, params)
          .then((result) => ({ ...result, items: result.experiments })),
      [api],
    ),
    options,
  );
};

export default useExperiments;
