import React from 'react';
import { GetArtifactsRequest } from '~/third_party/mlmd';
import {
  Artifact,
  ListOperationOptions,
} from '~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_pb';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

export const useFetchRunArtifact = (
  runId: string,
  modelRegistryAvailable: boolean,
): FetchState<Artifact[]> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const fetchArtifacts = React.useCallback(async () => {
    // Prevent API call when model registry is not available
    if (!modelRegistryAvailable) {
      return [];
    }

    const request = new GetArtifactsRequest();
    const options = new ListOperationOptions();

    options.setFilterQuery(`contexts_a.name = '${runId}'`);
    request.setOptions(options);

    const response = await metadataStoreServiceClient.getArtifacts(request);
    return response.getArtifactsList();
  }, [metadataStoreServiceClient, runId, modelRegistryAvailable]);

  return useFetchState(fetchArtifacts, []);
};
