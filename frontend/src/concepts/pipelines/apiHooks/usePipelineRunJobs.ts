import * as React from 'react';
import { PipelineRunJobKFv2 } from '~/concepts/pipelines/kfTypes';
import { FetchState } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';

const usePipelineRunJobs = (
  options?: PipelineOptions,
): FetchState<PipelineListPaged<PipelineRunJobKFv2>> => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<PipelineRunJobKFv2>(
    React.useCallback(
      (opts, params) =>
        api
          .listPipelineRunJobs(opts, params)
          .then((result) => ({ ...result, items: result.recurringRuns })),
      [api],
    ),
    options,
  );
};

export default usePipelineRunJobs;
