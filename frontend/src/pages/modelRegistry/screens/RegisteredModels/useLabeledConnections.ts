import React from 'react';
import { Connection } from '~/concepts/connectionTypes/types';
import { convertObjectStorageSecretData } from '~/concepts/connectionTypes/utils';
import { ObjectStorageFields, uriToObjectStorageFields } from '~/concepts/modelRegistry/utils';
import { LabeledConnection } from '~/pages/modelServing/screens/types';
import { AwsKeys } from '~/pages/projects/dataConnections/const';

const useLabeledConnections = (
  modelArtifactUri: string | undefined,
  connections: Connection[] = [],
): {
  connections: LabeledConnection[];
  storageFields: { s3Fields: ObjectStorageFields | null; uri: string | null } | null;
} =>
  React.useMemo(() => {
    if (!modelArtifactUri) {
      return {
        connections: connections.map((connection) => ({ connection })),
        storageFields: null,
      };
    }
    const storageFields = uriToObjectStorageFields(modelArtifactUri);
    if (!storageFields) {
      return {
        connections: connections.map((connection) => ({ connection })),
        storageFields,
      };
    }
    const labeledConnections = connections.map((connection) => {
      if (storageFields.s3Fields) {
        const awsData = convertObjectStorageSecretData(connection);
        const bucket = awsData.find((data) => data.key === AwsKeys.AWS_S3_BUCKET)?.value;
        const endpoint = awsData.find((data) => data.key === AwsKeys.S3_ENDPOINT)?.value;
        const region = awsData.find((data) => data.key === AwsKeys.DEFAULT_REGION)?.value;
        if (
          bucket === storageFields.s3Fields.bucket &&
          endpoint === storageFields.s3Fields.endpoint &&
          (region === storageFields.s3Fields.region || !storageFields.s3Fields.region)
        ) {
          return { connection, isRecommended: true };
        }
      }
      if (storageFields.uri && connection.data?.URI) {
        const findURI = storageFields.uri === window.atob(connection.data.URI);
        if (findURI) {
          return { connection, isRecommended: true };
        }
      }
      return { connection };
    });
    return { connections: labeledConnections, storageFields };
  }, [connections, modelArtifactUri]);

export default useLabeledConnections;
