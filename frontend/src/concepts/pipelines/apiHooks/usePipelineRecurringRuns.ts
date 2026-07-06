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
        const versionIdPredicate = params?.filter?.predicates?.find(
          (p) => p.key === 'pipeline_version_id',
        )?.string_value;
        const predicatesWithoutVersion = params?.filter?.predicates?.filter(
          (p) => p.key !== 'pipeline_version_id',
        );

        const response = await api.listPipelineRecurringRuns(opts, {
          ...params,
          ...(experimentId && { experimentId }),
          filter: predicatesWithoutVersion
            ? { predicates: predicatesWithoutVersion }
            : params?.filter,
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

        const filteredRuns = versionIdPredicate
          ? completeRecurringRuns.filter(
              (r) => r.pipeline_version_reference.pipeline_version_id === versionIdPredicate,
            )
          : completeRecurringRuns;

        return {
          ...response,
          items: filteredRuns,
          // eslint-disable-next-line camelcase
          total_size: versionIdPredicate ? filteredRuns.length : response.total_size,
        };
      },
      [api, experimentId, fetchLatestVersionId],
    ),
    options,
  );
};

export default usePipelineRecurringRuns;
