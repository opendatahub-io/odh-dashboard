import React from 'react';

import { Artifact, Context } from '#~/third_party/mlmd';
import { GetArtifactsByContextRequest } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';

export const useGetArtifactsByRuns = (
  runs: PipelineRunKF[],
  contexts: Context[],
): FetchState<Record<string, Artifact[]>[]> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<Record<string, Artifact[]>[]>>(
    () =>
      Promise.all(
        runs.map(async (run) => {
          const context = contexts.find((x) => x.getName() === run.run_id);
          if (!context) {
            throw new Error(`No context for run: ${run.run_id}`);
          }
          const request = new GetArtifactsByContextRequest();
          request.setContextId(context.getId());

          const response = await metadataStoreServiceClient.getArtifactsByContext(request);
          const artifacts = response.getArtifactsList();

          return {
            [run.run_id]: artifacts,
          };
        }),
      ),
    [contexts, metadataStoreServiceClient, runs],
  );

  return useFetchState(call, []);
};
