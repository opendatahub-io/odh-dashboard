import * as React from 'react';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineOptions } from '~/concepts/pipelines/types';

const usePipelineVersionsForPipeline = (pipelineId: string, options?: PipelineOptions) => {
  const { api } = usePipelinesAPI();

  return usePipelineQuery<PipelineVersionKF>(
    React.useCallback(
      (opts, params) =>
        api
          .listPipelineVersionsByPipeline(opts, pipelineId, params)
          .then((result) => ({ ...result, items: result.versions })),
      [api, pipelineId],
    ),
    options,
  );
};

export default usePipelineVersionsForPipeline;
