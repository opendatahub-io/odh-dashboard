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
  storageFields: ObjectStorageFields | null;
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
      const awsData = convertObjectStorageSecretData(connection);
      const bucket = awsData.find((data) => data.key === AwsKeys.AWS_S3_BUCKET)?.value;
      const endpoint = awsData.find((data) => data.key === AwsKeys.S3_ENDPOINT)?.value;
      const region = awsData.find((data) => data.key === AwsKeys.DEFAULT_REGION)?.value;
      if (
        bucket === storageFields.bucket &&
        endpoint === storageFields.endpoint &&
        (region === storageFields.region || !storageFields.region)
      ) {
        return { connection, isRecommended: true };
      }
      return { connection };
    });
    return { connections: labeledConnections, storageFields };
  }, [connections, modelArtifactUri]);

export default useLabeledConnections;
