import React from 'react';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { Artifact, GetArtifactsRequest } from '~/third_party/mlmd';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

export const useGetArtifactsList = (
  refreshRate?: number,
): FetchState<Artifact.AsObject[] | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const fetchArtifactsList = React.useCallback(async () => {
    const response = await metadataStoreServiceClient.getArtifacts(new GetArtifactsRequest());
    return response.toObject().artifactsList;
  }, [metadataStoreServiceClient]);

  return useFetchState(fetchArtifactsList, null, {
    refreshRate,
  });
};
