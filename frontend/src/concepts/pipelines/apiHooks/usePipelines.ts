import * as React from 'react';
import { FetchState, NotReadyError } from '#~/utilities/useFetchState';
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';
import usePipelineQuery from '#~/concepts/pipelines/apiHooks/usePipelineQuery';
import {
  ListPipelines,
  PipelineListPaged,
  PipelineOptions,
  PipelineParams,
} from '#~/concepts/pipelines/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { K8sAPIOptions } from '#~/k8sTypes';

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

export const useSafePipelines = (
  options?: PipelineOptions,
  refreshRate?: number,
): FetchState<PipelineListPaged<PipelineKF>> => {
  const { api, pipelinesServer, apiAvailable } = usePipelinesAPI();
  return usePipelineQuery<PipelineKF>(
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

async function getAllPipelines(
  opts: K8sAPIOptions,
  params: PipelineParams | undefined,
  listPipelines: ListPipelines,
): Promise<PipelineKF[]> {
  const result = await listPipelines(opts, params);
  let allPipelines = result.pipelines ?? [];

  if (result.next_page_token) {
    const nextPipelines = await getAllPipelines(
      opts,
      { ...params, pageToken: result.next_page_token },
      listPipelines,
    );
    allPipelines = allPipelines.concat(nextPipelines);
  }

  return allPipelines;
}

export const useAllPipelines = (
  options?: PipelineOptions,
  refreshRate?: number,
): FetchState<PipelineListPaged<PipelineKF>> => {
  const { api } = usePipelinesAPI();

  return usePipelineQuery<PipelineKF>(
    React.useCallback(
      async (opts, params) => {
        const allPipelines = await getAllPipelines(opts, params, api.listPipelines);

        return { items: allPipelines };
      },
      [api.listPipelines],
    ),
    options,
    refreshRate,
  );
};

export default usePipelines;
