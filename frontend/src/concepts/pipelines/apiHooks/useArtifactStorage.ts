import React from 'react';
import { Artifact } from '~/third_party/mlmd';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

export type ArtifactType = {
  getStorageObjectSize: (artifact: Artifact) => Promise<number>;
  getStorageObjectUrl: (artifact: Artifact) => Promise<string | undefined>;
};

export const useArtifactStorage = (): ArtifactType => {
  const { api } = usePipelinesAPI();

  const getStorageObjectSize = React.useCallback(
    async (artifact: Artifact): Promise<number> =>
      api
        .getArtifact({}, artifact.getId())
        .then((artifactStorage) => Number(artifactStorage.artifact_size))
        .catch((e) => {
          throw new Error(`Error fetching Storage size ${e}`);
        }),
    [api],
  );

  const getStorageObjectUrl = React.useCallback(
    async (artifact: Artifact): Promise<string | undefined> =>
      api
        .getArtifact({}, artifact.getId(), 'DOWNLOAD')
        .then((artifactStorage) => artifactStorage.download_url)
        .catch((e) => {
          throw new Error(`Error fetching Storage url ${e}`);
        }),
    [api],
  );

  return { getStorageObjectSize, getStorageObjectUrl };
};
