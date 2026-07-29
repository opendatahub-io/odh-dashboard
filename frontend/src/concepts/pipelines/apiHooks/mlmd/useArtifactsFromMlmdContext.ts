import React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { MlmdContext } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { Artifact } from '#~/third_party/mlmd';
import { GetArtifactsByContextRequest } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_pb';

export const useArtifactsFromMlmdContext = (
  context: MlmdContext | null,
  refreshRate?: number,
): FetchState<Artifact[]> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const getArtifactsList = React.useCallback<FetchStateCallbackPromise<Artifact[]>>(async () => {
    if (!context) {
      return Promise.reject(new NotReadyError('No context'));
    }

    const request = new GetArtifactsByContextRequest();
    request.setContextId(context.getId());
    const res = await metadataStoreServiceClient.getArtifactsByContext(request);
    return res.getArtifactsList();
  }, [metadataStoreServiceClient, context]);

  return useFetchState(getArtifactsList, [], {
    refreshRate,
  });
};
