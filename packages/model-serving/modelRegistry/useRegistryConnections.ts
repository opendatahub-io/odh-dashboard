import React from 'react';
import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { convertObjectStorageSecretData } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { uriToModelLocation } from '@odh-dashboard/internal/concepts/modelRegistry/utils';
import { AccessTypes, AwsKeys } from '@odh-dashboard/internal/pages/projects/dataConnections/const';

/**
 * Custom hook that filters connections to return only those that match a model artifact location.
 * This is useful for finding connections that can access a specific model artifact URI.
 *
 * @param modelArtifactUri - The URI of the model artifact (s3://, oci://, or regular URI)
 * @param connections - Array of connections to filter
 * @returns Array of connections that match the model location, empty array if none match
 *
 * @example
 * ```tsx
 * const matchingConnections = useRegistryConnections(
 *   "s3://my-bucket/models/model.pkl?endpoint=https://s3.amazonaws.com",
 *   [connection1, connection2, connection3]
 * );
 * // Returns only connections that match the S3 location
 * ```
 */
const useRegistryConnections = (
  modelArtifactUri: string | undefined,
  connections: Connection[] = [],
): Connection[] =>
  React.useMemo(() => {
    // If no URI provided, return empty array
    if (!modelArtifactUri) {
      return [];
    }

    // Parse the URI to get model location
    const modelLocation = uriToModelLocation(modelArtifactUri);
    if (!modelLocation) {
      return [];
    }

    // Filter connections to only those that match the model location
    return connections.filter((connection) => {
      // Check S3 matching
      if (modelLocation.s3Fields) {
        const awsData = convertObjectStorageSecretData(connection);
        const bucket = awsData.find((data) => data.key === AwsKeys.AWS_S3_BUCKET)?.value;
        const endpoint = awsData.find((data) => data.key === AwsKeys.S3_ENDPOINT)?.value;
        const region = awsData.find((data) => data.key === AwsKeys.DEFAULT_REGION)?.value;
        if (
          bucket === modelLocation.s3Fields.bucket &&
          endpoint === modelLocation.s3Fields.endpoint &&
          (region === modelLocation.s3Fields.region || !modelLocation.s3Fields.region)
        ) {
          return true;
        }
      }

      // Check OCI matching
      if (modelLocation.ociUri && connection.data?.OCI_HOST) {
        const findURI = modelLocation.ociUri.includes(window.atob(connection.data.OCI_HOST));
        const accessTypes = connection.data.ACCESS_TYPE && window.atob(connection.data.ACCESS_TYPE);
        // Match if ACCESS_TYPE is empty (not set) or if it includes Pull
        if (findURI && (!accessTypes || accessTypes.includes(AccessTypes.PULL))) {
          return true;
        }
      }

      // Check URI matching
      if (modelLocation.uri && connection.data?.URI) {
        const findURI = modelLocation.uri === window.atob(connection.data.URI);
        if (findURI) {
          return true;
        }
      }

      return false;
    });
  }, [connections, modelArtifactUri]);

export default useRegistryConnections;
