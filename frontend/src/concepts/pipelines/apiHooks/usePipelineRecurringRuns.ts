import * as React from 'react';
import { PipelineRecurringRunKF } from '#~/concepts/pipelines/kfTypes';
import { FetchState } from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import usePipelineQuery from '#~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineListPaged, PipelineRunOptions } from '#~/concepts/pipelines/types';
import { K8sAPIOptions } from '#~/k8sTypes';

const usePipelineRecurringRuns = (
  options?: PipelineRunOptions,
): FetchState<PipelineListPaged<PipelineRecurringRunKF>> => {
  const { api } = usePipelinesAPI();
  const experimentId = options?.experimentId;

  const fetchLatestVersionId = React.useCallback(
    async (pipelineId: string, opts: K8sAPIOptions) => {
      const response = await api.listPipelineVersions(opts, pipelineId, {
        sortField: 'created_at',
        sortDirection: 'desc',
      });
      return response.pipeline_versions?.[0].pipeline_version_id;
    },
    [api],
  );

  return usePipelineQuery<PipelineRecurringRunKF>(
    React.useCallback(
      async (opts, params) => {
        const response = await api.listPipelineRecurringRuns(opts, {
          ...params,
          ...(experimentId && { experimentId }),
        });

        if (!response.recurringRuns) {
          return response;
        }

        const completeRecurringRuns = await Promise.all(
          response.recurringRuns.map(async (recurringRun) => {
            if (recurringRun.pipeline_version_reference.pipeline_version_id) {
              return recurringRun;
            }

            return {
              ...recurringRun,
              // eslint-disable-next-line camelcase
              pipeline_version_reference: {
                ...recurringRun.pipeline_version_reference,
                // eslint-disable-next-line camelcase
                pipeline_version_id: await fetchLatestVersionId(
                  recurringRun.pipeline_version_reference.pipeline_id,
                  opts,
                ),
              },
            };
          }),
        );
        return { ...response, items: completeRecurringRuns };
      },
      [api, experimentId, fetchLatestVersionId],
    ),
    options,
  );
};

export default usePipelineRecurringRuns;
