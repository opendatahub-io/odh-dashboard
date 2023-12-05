import * as React from 'react';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineOptions } from '~/concepts/pipelines/types';

const usePipelines = (options?: PipelineOptions, refreshRate?: number) => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<PipelineKF>(
    React.useCallback(
      (opts, params) =>
        api.listPipelines(opts, params).then((result) => ({ ...result, items: result.pipelines })),
      [api],
    ),
    options,
    refreshRate,
  );
};

export default usePipelines;
