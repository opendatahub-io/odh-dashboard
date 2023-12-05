import * as React from 'react';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineOptions } from '~/concepts/pipelines/types';
import { NotReadyError } from '~/utilities/useFetchState';

const usePipelineVersionsForPipeline = (
  pipelineId?: string,
  options?: PipelineOptions,
  refreshRate?: number,
) => {
  const { api } = usePipelinesAPI();

  return usePipelineQuery<PipelineVersionKF>(
    React.useCallback(
      (opts, params) => {
        if (!pipelineId) {
          return Promise.reject(new NotReadyError('No pipeline id'));
        }
        return api
          .listPipelineVersionsByPipeline(opts, pipelineId, params)
          .then((result) => ({ ...result, items: result.versions }));
      },
      [api, pipelineId],
    ),
    options,
    refreshRate,
  );
};

export default usePipelineVersionsForPipeline;
