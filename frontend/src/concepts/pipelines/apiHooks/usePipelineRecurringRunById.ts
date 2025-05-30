import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineRecurringRunKF } from '#~/concepts/pipelines/kfTypes';
import { K8sAPIOptions } from '#~/k8sTypes';

const usePipelineRecurringRunById = (
  pipelineRecurringRunByIdId?: string,
): FetchState<PipelineRecurringRunKF | null> => {
  const { api } = usePipelinesAPI();

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

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRecurringRunKF | null>>(
    async (opts) => {
      if (!pipelineRecurringRunByIdId) {
        return Promise.reject(new NotReadyError('No pipeline recurring run id'));
      }
      const recurringRun = await api.getPipelineRecurringRun(opts, pipelineRecurringRunByIdId);

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
    },
    [api, fetchLatestVersionId, pipelineRecurringRunByIdId],
  );

  return useFetchState(call, null);
};

export default usePipelineRecurringRunById;
