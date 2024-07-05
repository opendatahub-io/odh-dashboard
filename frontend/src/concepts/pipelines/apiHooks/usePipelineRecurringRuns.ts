import * as React from 'react';
import { PipelineRecurringRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { FetchState } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineRunOptions } from '~/concepts/pipelines/types';

const usePipelineRecurringRuns = (
  options?: PipelineRunOptions,
): FetchState<PipelineListPaged<PipelineRecurringRunKFv2>> => {
  const { api } = usePipelinesAPI();
  const experimentId = options?.experimentId;
  const pipelineVersionId = options?.pipelineVersionId;

  return usePipelineQuery<PipelineRecurringRunKFv2>(
    React.useCallback(
      (opts, params) =>
        api
          .listPipelineRecurringRuns(opts, {
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

export default usePipelineRecurringRuns;
