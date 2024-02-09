import React from 'react';
import { PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineQuery from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineOptions } from '~/concepts/pipelines/types';
import { FetchState, NotReadyError } from '~/utilities/useFetchState';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';

/**
 * Fetch all pipelines, then use those pipeline IDs to accumulate a list of pipeline versions.
 */
export const useAllPipelineVersions = (
  options: PipelineOptions = {},
  refreshRate = 0,
): FetchState<PipelineListPaged<PipelineVersionKFv2>> => {
  const { api } = usePipelinesAPI();
  const [{ items: pipelines }] = usePipelines();
  const pipelineIds = useDeepCompareMemoize(
    pipelines?.map((pipeline) => pipeline.pipeline_id) || [],
  );

  return usePipelineQuery<PipelineVersionKFv2>(
    React.useCallback(
      async (opts, params) => {
        if (pipelineIds.length === 0) {
          return Promise.reject(new NotReadyError('No pipeline id'));
        }

        const pipelineVersionRequests = pipelineIds.map((pipelineId) =>
          api.listPipelineVersions(opts, pipelineId, params),
        );
        const results = await Promise.all(pipelineVersionRequests);

        return results.reduce(
          (acc: { total_size: number; items: PipelineVersionKFv2[] }, result) => {
            // eslint-disable-next-line camelcase
            acc.total_size += result.total_size || 0;
            acc.items = acc.items?.concat(result?.pipeline_versions || []);

            return acc;
          },
          // eslint-disable-next-line camelcase
          { total_size: 0, items: [] },
        );
      },
      [api, pipelineIds],
    ),
    options,
    refreshRate,
  );
};
