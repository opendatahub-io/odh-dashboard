import React from 'react';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { GetEventsByArtifactIDsRequest, Event } from '#~/third_party/mlmd';

export const useGetEventByArtifactId = (artifactId?: number): FetchState<Event | null> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<Event | null>>(async () => {
    const request = new GetEventsByArtifactIDsRequest();

    if (!artifactId) {
      return null;
    }

    request.setArtifactIdsList([artifactId]);

    const response = await metadataStoreServiceClient.getEventsByArtifactIDs(request);
    return response.getEventsList().length !== 0 ? response.getEventsList()[0] : null;
  }, [artifactId, metadataStoreServiceClient]);

  return useFetchState(call, null);
};
