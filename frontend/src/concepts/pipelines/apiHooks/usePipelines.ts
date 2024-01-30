import * as React from 'react';
import { FetchState } from '~/utilities/useFetchState';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';

// TODO: bring back during https://issues.redhat.com/browse/RHOAIENG-2224

// const usePipelines = (
//   options?: PipelineOptions,
//   refreshRate?: number,
// ): FetchState<PipelineListPaged<_PipelineKF>> => {
//   const { api } = usePipelinesAPI();
//   return usePipelineQuery<_PipelineKF>(
//     React.useCallback(
//       (opts, params) =>
//         api.listPipelines(opts, params).then((result) => ({ ...result, items: result.pipelines })),
//       [api],
//     ),
//     options,
//     refreshRate,
//   );
// };

const usePipelines = (
  options?: PipelineOptions,
  refreshRate?: number,
): FetchState<PipelineListPaged<PipelineKF>> =>
  usePipelineQuery<PipelineKF>(
    React.useCallback(() => ({ items: [] }), []),
    options,
    refreshRate,
  );

export default usePipelines;
