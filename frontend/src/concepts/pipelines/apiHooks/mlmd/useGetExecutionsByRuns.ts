import React from 'react';

import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { Context, Execution } from '#~/third_party/mlmd';
import { GetExecutionsByContextRequest } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';

export const useGetExecutionsByRuns = (
  runs: PipelineRunKF[],
  contexts: Context[],
): FetchState<Record<string, Execution[]>[]> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const runIds = React.useMemo(() => runs.map((r) => r.run_id).join(','), [runs]);
  const contextKey = React.useMemo(
    () => contexts.map((c) => `${c.getName()}:${c.getId()}`).join(','),
    [contexts],
  );

  const call = React.useCallback<FetchStateCallbackPromise<Record<string, Execution[]>[]>>(() => {
    if (!runIds) {
      return Promise.reject(new NotReadyError('No runs'));
    }
    if (!contextKey) {
      return Promise.reject(new NotReadyError('Contexts not loaded'));
    }

    return Promise.all(
      runs.map(async (run) => {
        const context = contexts.find((x) => x.getName() === run.run_id);
        if (!context) {
          // Intentionally silent: nested MLflow runs are supplementary.
          // Unlike useGetArtifactsByRuns, a missing context should not
          // fail the entire batch.
          return { [run.run_id]: [] };
        }
        const request = new GetExecutionsByContextRequest();
        request.setContextId(context.getId());

        const response = await metadataStoreServiceClient.getExecutionsByContext(request);
        const executions = response.getExecutionsList();

        return {
          [run.run_id]: executions,
        };
      }),
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIds, contextKey, metadataStoreServiceClient]);

  return useFetchState(call, [], { initialPromisePurity: true });
};
