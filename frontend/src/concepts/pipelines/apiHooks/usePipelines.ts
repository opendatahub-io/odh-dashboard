import * as React from 'react';
import { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

const usePipelines = (
  options?: PipelineOptions,
  refreshRate?: number,
): FetchState<PipelineListPaged<PipelineKFv2>> => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<PipelineKFv2>(
    React.useCallback(
      (opts, params) =>
        api.listPipelines(opts, params).then((result) => ({ ...result, items: result.pipelines })),
      [api],
    ),
    options,
    refreshRate,
  );
};

export const useSafePipelines = (
  options?: PipelineOptions,
  refreshRate?: number,
): FetchState<PipelineListPaged<PipelineKFv2>> => {
  const { api, pipelinesServer, apiAvailable } = usePipelinesAPI();
  return usePipelineQuery<PipelineKFv2>(
    React.useCallback(
      (opts, params) => {
        if (!apiAvailable || !pipelinesServer.compatible) {
          throw new NotReadyError('Pipelines is not available');
        }
        return api
          .listPipelines(opts, params)
          .then((result) => ({ ...result, items: result.pipelines }));
      },
      [api, apiAvailable, pipelinesServer.compatible],
    ),
    options,
    refreshRate,
  );
};

export default usePipelines;
