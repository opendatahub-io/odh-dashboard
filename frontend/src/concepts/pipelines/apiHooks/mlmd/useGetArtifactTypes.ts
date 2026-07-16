import React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ArtifactType, GetArtifactTypesRequest } from '#~/third_party/mlmd';

export const useGetArtifactTypes = (): FetchState<ArtifactType[]> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<ArtifactType[]>>(async () => {
    const request = new GetArtifactTypesRequest();

    const res = await metadataStoreServiceClient.getArtifactTypes(request);

    return res.getArtifactTypesList();
  }, [metadataStoreServiceClient]);

  return useFetchState(call, []);
};
