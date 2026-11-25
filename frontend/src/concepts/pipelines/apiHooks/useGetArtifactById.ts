import React from 'react';
import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ArtifactKF } from '#~/concepts/pipelines/kfTypes';

export const useGetArtifactById = (artifactId?: string): FetchState<ArtifactKF | undefined> => {
  const { api } = usePipelinesAPI();

  const fetchArtifact = React.useCallback(
    async (opts: Parameters<typeof api.getArtifactResource>[0]) => {
      if (!artifactId) {
        throw new Error('Artifact ID is required');
      }
      return api.getArtifactResource(opts, artifactId);
    },
    [api, artifactId],
  );

  return useFetchState(fetchArtifact, undefined, { initialPromisePurity: true });
};
