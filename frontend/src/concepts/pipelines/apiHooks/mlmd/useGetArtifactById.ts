import React from 'react';

import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { Artifact, GetArtifactsByIDRequest } from '#~/third_party/mlmd';

export const useGetArtifactById = (
  artifactId: number,
  refreshRate?: number,
): FetchState<Artifact | undefined> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const fetchArtifact = React.useCallback(async () => {
    const request = new GetArtifactsByIDRequest();
    request.setArtifactIdsList([artifactId]);

    const response = await metadataStoreServiceClient.getArtifactsByID(request);

    return response.getArtifactsList()[0];
  }, [artifactId, metadataStoreServiceClient]);

  return useFetchState(fetchArtifact, undefined, {
    refreshRate,
  });
};
