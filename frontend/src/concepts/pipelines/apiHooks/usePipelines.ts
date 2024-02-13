import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { FetchState } from '~/utilities/useFetchState';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';

const usePipelines = (
  options?: PipelineOptions,
  refreshRate?: number,
): FetchState<PipelineListPaged<PipelineKF>> => {
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
