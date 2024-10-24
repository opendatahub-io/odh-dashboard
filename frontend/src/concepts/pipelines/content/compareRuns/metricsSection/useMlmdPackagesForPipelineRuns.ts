import React from 'react';
import { MlmdContextTypes } from '~/concepts/pipelines/apiHooks/mlmd/types';
import { getMlmdContext } from '~/concepts/pipelines/apiHooks/mlmd/useMlmdContext';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';
import {
  GetArtifactsByContextRequest,
  GetEventsByExecutionIDsRequest,
  GetExecutionsByContextRequest,
} from '~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';
import { PipelineRunRelatedMlmd } from './types';

const useMlmdPackagesForPipelineRuns = (
  runs: PipelineRunKF[],
): FetchState<PipelineRunRelatedMlmd[]> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunRelatedMlmd[]>>(
    () =>
      Promise.all(
        runs.map((run) =>
          getMlmdContext(metadataStoreServiceClient, run.run_id, MlmdContextTypes.RUN).then(
            async (context) => {
              if (!context) {
                throw new Error(`No context for run: ${run.run_id}`);
              }
              // get artifacts
              const artifactRequest = new GetArtifactsByContextRequest();
              artifactRequest.setContextId(context.getId());
              const artifactRes = await metadataStoreServiceClient.getArtifactsByContext(
                artifactRequest,
              );
              const artifacts = artifactRes.getArtifactsList();

              // get executions
              const executionRequest = new GetExecutionsByContextRequest();
              executionRequest.setContextId(context.getId());
              const executionRes = await metadataStoreServiceClient.getExecutionsByContext(
                executionRequest,
              );
              const executions = executionRes.getExecutionsList();

              // get events
              const eventRequest = new GetEventsByExecutionIDsRequest();
              executions.forEach((exec) => {
                const execId = exec.getId();
                if (!execId) {
                  throw new Error('Execution must have an ID');
                }
                eventRequest.addExecutionIds(execId);
              });
              const eventRes = await metadataStoreServiceClient.getEventsByExecutionIDs(
                eventRequest,
              );
              const events = eventRes.getEventsList();

              return {
                run,
                artifacts,
                events,
                executions,
              };
            },
          ),
        ),
      ),
    [metadataStoreServiceClient, runs],
  );

  return useFetchState(call, []);
};

export default useMlmdPackagesForPipelineRuns;
