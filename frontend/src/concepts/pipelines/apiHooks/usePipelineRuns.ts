import * as React from 'react';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineOptions } from '~/concepts/pipelines/types';

const usePipelineRuns = (options?: PipelineOptions) => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<PipelineRunKF>(
    React.useCallback(
      (opts, params) =>
        api.listPipelineRuns(opts, params).then((result) => ({ ...result, items: result.runs })),
      [api],
    ),
    options,
  );
};

export default usePipelineRuns;
