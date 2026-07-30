import React from 'react';

import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { usePipelinesAPI, useMlmdListContext } from '#~/concepts/pipelines/context';
import { Artifact, GetArtifactsRequest } from '#~/third_party/mlmd';
import { ListOperationOptions } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_pb';

export interface ArtifactsListResponse {
  artifacts: Artifact[];
  nextPageToken: string;
}

export const useGetArtifactsList = (
  refreshRate?: number,
): FetchState<ArtifactsListResponse | undefined> => {
  const { pageToken, maxResultSize, filterQuery } = useMlmdListContext();
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const fetchArtifactsList = React.useCallback(async () => {
    const request = new GetArtifactsRequest();
    const listOperationOptions = new ListOperationOptions();

    if (filterQuery) {
      listOperationOptions.setFilterQuery(filterQuery);
    }

    if (pageToken) {
      listOperationOptions.setNextPageToken(pageToken);
    }

    listOperationOptions.setMaxResultSize(maxResultSize);
    request.setOptions(listOperationOptions);

    const response = await metadataStoreServiceClient.getArtifacts(request);

    return {
      artifacts: response.getArtifactsList(),
      nextPageToken: response.getNextPageToken(),
    };
  }, [filterQuery, pageToken, maxResultSize, metadataStoreServiceClient]);

  return useFetchState(fetchArtifactsList, undefined, {
    refreshRate,
  });
};
