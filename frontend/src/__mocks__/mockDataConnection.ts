import { DataConnection } from '~/pages/projects/types';
import { genUID } from '~/__mocks__/mockUtils';
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { KnownLabels } from '~/k8sTypes';

type MockDataConnectionType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  s3Bucket?: string;
};

export const mockDataConnection = ({
  name = 'test-secret',
  namespace = 'test-project',
  displayName = 'Test Secret',
  s3Bucket = 'test-bucket',
}: MockDataConnectionType): DataConnection => ({
  type: 0,
  data: {
    kind: 'Secret',
    apiVersion: 'v1',
    metadata: {
      name,
      namespace,
      uid: genUID('secret'),
      resourceVersion: '5985371',
      creationTimestamp: '2023-03-22T16:18:56Z',
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        [KnownLabels.DATA_CONNECTION_AWS]: 'true',
      },
      annotations: {
        'opendatahub.io/connection-type': 's3',
        'openshift.io/display-name': displayName,
      },
    },
    data: {
      [AWS_KEYS.NAME]: name,
      AWS_ACCESS_KEY_ID: 'c2RzZA==',
      AWS_DEFAULT_REGION: 'us-east-1',
      AWS_S3_BUCKET: s3Bucket,
      AWS_S3_ENDPOINT: 'http://aws.com',
      AWS_SECRET_ACCESS_KEY: 'aHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tLw==',
    },
    type: 'Opaque',
  },
});
