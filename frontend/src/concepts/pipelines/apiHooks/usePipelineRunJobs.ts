import * as React from 'react';
import { PipelineRunJobKFv2 } from '~/concepts/pipelines/kfTypes';
import { FetchState } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineRunOptions } from '~/concepts/pipelines/types';

const usePipelineRunJobs = (
  options?: PipelineRunOptions,
): FetchState<PipelineListPaged<PipelineRunJobKFv2>> => {
  const { api } = usePipelinesAPI();
  const experimentId = options?.experimentId;
  const pipelineVersionId = options?.pipelineVersionId;

  return usePipelineQuery<PipelineRunJobKFv2>(
    React.useCallback(
      (opts, params) =>
        api
          .listPipelineRunJobs(opts, {
            ...params,
            ...(experimentId && { experimentId }),
            ...(pipelineVersionId && { pipelineVersionId }),
          })
          .then((result) => ({ ...result, items: result.recurringRuns })),
      [api, experimentId, pipelineVersionId],
    ),
    options,
  );
};

export default usePipelineRunJobs;
