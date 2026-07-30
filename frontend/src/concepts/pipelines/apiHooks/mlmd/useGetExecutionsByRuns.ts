import React from 'react';

import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
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

  const call = React.useCallback<FetchStateCallbackPromise<Record<string, Execution[]>[]>>(
    () =>
      Promise.all(
        runs.map(async (run) => {
          const context = contexts.find((x) => x.getName() === run.run_id);
          if (!context) {
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
      ),
    [contexts, metadataStoreServiceClient, runs],
  );

  return useFetchState(call, []);
};
