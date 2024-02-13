import * as React from 'react';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import { FetchState } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';

const usePipelineRunJobs = (
  options?: PipelineOptions,
): FetchState<PipelineListPaged<PipelineRunJobKF>> => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<PipelineRunJobKF>(
    React.useCallback(
      (opts, params) =>
        api.listPipelineRunJobs(opts, params).then((result) => ({ ...result, items: result.jobs })),
      [api],
    ),
    options,
  );
};

export default usePipelineRunJobs;
