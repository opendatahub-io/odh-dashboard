import * as React from 'react';
import { PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import usePipelineQuery from '#~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '#~/concepts/pipelines/types';
import { FetchState, NotReadyError } from '#~/utilities/useFetchState';

const usePipelineVersionsForPipeline = (
  pipelineId?: string,
  options: PipelineOptions = {},
  refreshRate = 0,
): FetchState<PipelineListPaged<PipelineVersionKF>> => {
  const { api } = usePipelinesAPI();

  return usePipelineQuery<PipelineVersionKF>(
    React.useCallback(
      (opts, params) => {
        if (!pipelineId) {
          return Promise.reject(new NotReadyError('No pipeline id'));
        }
        return api
          .listPipelineVersions(opts, pipelineId, params)
          .then((result) => ({ ...result, items: result.pipeline_versions }));
      },
      [api, pipelineId],
    ),
    options,
    refreshRate,
  );
};

export default usePipelineVersionsForPipeline;
