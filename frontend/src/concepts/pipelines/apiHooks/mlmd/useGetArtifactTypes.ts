import React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { GetArtifactTypesRequest } from '~/third_party/mlmd';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

export const useGetArtifactTypeMap = (): FetchState<Record<number, string>> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<Record<number, string>>>(async () => {
    const request = new GetArtifactTypesRequest();

    const res = await metadataStoreServiceClient.getArtifactTypes(request);

    const artifactTypeMap: Record<number, string> = {};
    res.getArtifactTypesList().forEach((artifactType) => {
      artifactTypeMap[artifactType.getId()] = artifactType.getName();
    });
    return artifactTypeMap;
  }, [metadataStoreServiceClient]);

  return useFetchState(call, {});
};
