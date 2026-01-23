import React from 'react';
import { Connection } from '#~/concepts/connectionTypes/types';
import { convertObjectStorageSecretData } from '#~/concepts/connectionTypes/utils';
import { ModelLocation, uriToModelLocation } from '#~/concepts/modelRegistry/utils';
import { LabeledConnection } from '#~/pages/modelServing/screens/types';
import { AwsKeys, AccessTypes } from '#~/pages/projects/dataConnections/const';

const useLabeledConnections = (
  modelArtifactUri: string | undefined,
  connections: Connection[] = [],
): {
  connections: LabeledConnection[];
  modelLocation: ModelLocation;
} =>
  React.useMemo(() => {
    if (!modelArtifactUri) {
      return {
        connections: connections.map((connection) => ({ connection })),
        modelLocation: null,
      };
    }
    const modelLocation = uriToModelLocation(modelArtifactUri);
    if (!modelLocation) {
      return {
        connections: connections.map((connection) => ({ connection })),
        modelLocation,
      };
    }
    const labeledConnections = connections.map((connection) => {
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
          return { connection, isRecommended: true };
        }
      }
      if (modelLocation.ociUri && connection.data?.OCI_HOST) {
        const findURI = modelLocation.ociUri.includes(window.atob(connection.data.OCI_HOST));
        const accessTypes = connection.data.ACCESS_TYPE && window.atob(connection.data.ACCESS_TYPE);
        if (findURI && accessTypes && accessTypes.includes(AccessTypes.PULL)) {
          return { connection, isRecommended: true };
        }
      }
      if (modelLocation.uri && connection.data?.URI) {
        const findURI = modelLocation.uri === window.atob(connection.data.URI);
        if (findURI) {
          return { connection, isRecommended: true };
        }
      }
      return { connection };
    });
    return { connections: labeledConnections, modelLocation };
  }, [connections, modelArtifactUri]);

export default useLabeledConnections;
