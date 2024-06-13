import * as React from 'react';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { FetchState } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineRunOptions } from '~/concepts/pipelines/types';

export const usePipelineActiveRuns = (
  options?: PipelineRunOptions,
): FetchState<PipelineListPaged<PipelineRunKFv2>> => {
  const { api } = usePipelinesAPI();
  const experimentId = options?.experimentId;
  const pipelineVersionId = options?.pipelineVersionId;

  return usePipelineQuery<PipelineRunKFv2>(
    React.useCallback(
      (opts, params) =>
        api
          .listPipelineActiveRuns(opts, {
            ...params,
            ...(experimentId && { experimentId }),
            ...(pipelineVersionId && { pipelineVersionId }),
          })
          .then((result) => ({ ...result, items: result.runs })),
      [api, experimentId, pipelineVersionId],
    ),
    options,
  );
};

export const usePipelineArchivedRuns = (
  options?: PipelineRunOptions,
): FetchState<PipelineListPaged<PipelineRunKFv2>> => {
  const { api } = usePipelinesAPI();
  const experimentId = options?.experimentId;
  const pipelineVersionId = options?.pipelineVersionId;

  return usePipelineQuery<PipelineRunKFv2>(
    React.useCallback(
      (opts, params) =>
        api
          .listPipelineArchivedRuns(opts, {
            ...params,
            ...(experimentId && { experimentId }),
            ...(pipelineVersionId && { pipelineVersionId }),
          })
          .then((result) => ({ ...result, items: result.runs })),
      [api, experimentId, pipelineVersionId],
    ),
    options,
  );
};

export const usePipelineRunsByExperiment = (
  experimentId: string,
  options?: PipelineRunOptions,
): FetchState<PipelineListPaged<PipelineRunKFv2>> => {
  const { api } = usePipelinesAPI();

  return usePipelineQuery<PipelineRunKFv2>(
    React.useCallback(
      (opts, params) =>
        api
          // eslint-disable-next-line camelcase
          .listPipelineRuns(opts, { ...params, experimentId })
          .then((result) => ({ ...result, items: result.runs })),
      [api, experimentId],
    ),
    options,
  );
};
