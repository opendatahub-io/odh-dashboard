import React from 'react';
import { LinkedArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { Artifact, Event, GetArtifactsByIDRequest } from '#~/third_party/mlmd';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';

export const useGetLinkedArtifactsByEvents = (events: Event[]): FetchState<LinkedArtifact[]> => {
  const { metadataStoreServiceClient } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<LinkedArtifact[]>>(async () => {
    const artifactIds = events
      .filter((event) => event.getArtifactId())
      .map((event) => event.getArtifactId());
    const request = new GetArtifactsByIDRequest();

    if (artifactIds.length === 0) {
      return [];
    }

    request.setArtifactIdsList(artifactIds);

    const response = await metadataStoreServiceClient.getArtifactsByID(request);

    const artifactMap: Record<number, Artifact> = {};
    response.getArtifactsList().forEach((artifact) => (artifactMap[artifact.getId()] = artifact));

    return events.map((event) => {
      const artifact = artifactMap[event.getArtifactId()];
      return { event, artifact };
    });
  }, [events, metadataStoreServiceClient]);

  return useFetchState(call, []);
};
