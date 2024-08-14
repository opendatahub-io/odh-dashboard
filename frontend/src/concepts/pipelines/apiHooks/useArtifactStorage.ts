import React from 'react';
import { Artifact } from '~/third_party/mlmd';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { fetchStorageObject, fetchStorageObjectSize } from '~/services/storageService';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import {
  extractS3UriComponents,
  getArtifactUrlFromUri,
} from '~/concepts/pipelines/content/artifacts/utils';

export type ArtifactType =
  | {
      enabled: false;
    }
  | {
      enabled: true;
      getStorageObject: (artifact: Artifact) => Promise<string>;
      getStorageObjectSize: (artifact: Artifact) => Promise<number>;
      getStorageObjectUrl: (artifact: Artifact) => Promise<string | undefined>;
    };

export const useArtifactStorage = (): ArtifactType => {
  const s3EndpointAvailable = useIsAreaAvailable(SupportedArea.S3_ENDPOINT).status;
  const artifactApiAvailable = useIsAreaAvailable(SupportedArea.ARTIFACT_API).status;

  const { api, namespace } = usePipelinesAPI();

  const enabled = s3EndpointAvailable || artifactApiAvailable;

  const getStorageObject = React.useCallback(
    async (artifact: Artifact): Promise<string> => {
      if (artifactApiAvailable) {
        return api
          .getArtifact({}, artifact.getId(), 'DOWNLOAD')
          .then((artifactStorage) => {
            if (artifactStorage.download_url) {
              return artifactStorage.download_url;
            }
            return Promise.reject();
          })
          .catch((e) => {
            throw new Error(`Error fetching Storage object ${e}`);
          });
      }

      const path = artifact.getUri();
      const uriComponents = extractS3UriComponents(path);
      if (uriComponents) {
        return fetchStorageObject(namespace, uriComponents.path);
      }
      return Promise.reject();
    },
    [api, artifactApiAvailable, namespace],
  );

  const getStorageObjectSize = React.useCallback(
    async (artifact: Artifact): Promise<number> => {
      if (artifactApiAvailable) {
        return api
          .getArtifact({}, artifact.getId())
          .then((artifactStorage) => Number(artifactStorage.artifact_size))
          .catch((e) => {
            throw new Error(`Error fetching Storage size ${e}`);
          });
      }
      const path = artifact.getUri();
      const uriComponents = extractS3UriComponents(path);
      if (uriComponents) {
        return fetchStorageObjectSize(namespace, uriComponents.path);
      }
      return Promise.reject();
    },
    [api, artifactApiAvailable, namespace],
  );

  const getStorageObjectUrl = React.useCallback(
    async (artifact: Artifact): Promise<string | undefined> => {
      if (artifactApiAvailable) {
        return api
          .getArtifact({}, artifact.getId(), 'DOWNLOAD')
          .then((artifactStorage) => artifactStorage.download_url)
          .catch((e) => {
            throw new Error(`Error fetching Storage url ${e}`);
          });
      }
      return getArtifactUrlFromUri(artifact.getUri(), namespace);
    },
    [api, artifactApiAvailable, namespace],
  );

  return React.useMemo(
    () =>
      enabled
        ? { enabled: true, getStorageObject, getStorageObjectSize, getStorageObjectUrl }
        : { enabled: false },
    [enabled, getStorageObject, getStorageObjectSize, getStorageObjectUrl],
  );
};
