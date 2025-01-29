import * as React from 'react';
import { PipelineRecurringRunKF } from '~/concepts/pipelines/kfTypes';
import { FetchState } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineRunOptions } from '~/concepts/pipelines/types';

const usePipelineRecurringRuns = (
  options?: PipelineRunOptions,
): FetchState<PipelineListPaged<PipelineRecurringRunKF>> => {
  const { api } = usePipelinesAPI();
  const experimentId = options?.experimentId;

  return usePipelineQuery<PipelineRecurringRunKF>(
    React.useCallback(
      (opts, params) =>
        api
          .listPipelineRecurringRuns(opts, {
            ...params,
            ...(experimentId && { experimentId }),
          })
          .then((result) => ({ ...result, items: result.recurringRuns })),
      [api, experimentId],
    ),
    options,
  );
};

export default usePipelineRecurringRuns;
