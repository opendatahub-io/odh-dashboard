import React from 'react';

import { Artifact } from '~/third_party/mlmd';
import { GetArtifactsByContextRequest } from '~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { MlmdContextTypes } from './types';
import { getMlmdContext } from './useMlmdContext';

export const useGetArtifactsByRuns = (
  runs: PipelineRunKF[],
): FetchState<Record<string, Artifact[]>[]> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<Record<string, Artifact[]>[]>>(
    () =>
      Promise.all(
        runs.map((run) =>
          getMlmdContext(metadataStoreServiceClient, run.run_id, MlmdContextTypes.RUN).then(
            async (context) => {
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
            },
          ),
        ),
      ),
    [metadataStoreServiceClient, runs],
  );

  return useFetchState(call, []);
};
