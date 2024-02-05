import * as React from 'react';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { FetchState } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';

const usePipelineRuns = (
  options?: PipelineOptions,
): FetchState<PipelineListPaged<PipelineRunKFv2>> => {
  const { api } = usePipelinesAPI();
  return usePipelineQuery<PipelineRunKFv2>(
    React.useCallback(
      (opts, params) =>
        api.listPipelineRuns(opts, params).then((result) => ({ ...result, items: result.runs })),
      [api],
    ),
    options,
  );
};

export default usePipelineRuns;
