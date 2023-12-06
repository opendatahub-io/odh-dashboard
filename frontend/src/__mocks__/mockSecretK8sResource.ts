import { KnownLabels, SecretKind } from '~/k8sTypes';
import { genUID } from '~/__mocks__/mockUtils';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  s3Bucket?: string;
};

export const mockSecretK8sResource = ({
  name = 'test-secret',
  namespace = 'test-project',
  displayName = 'Test Secret',
  s3Bucket = 'test-bucket',
}: MockResourceConfigType): SecretKind => ({
  kind: 'Secret',
  apiVersion: 'route.openshift.io/v1',
  metadata: {
    name: name,
    namespace: namespace,
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
    AWS_ACCESS_KEY_ID: 'c2RzZA==',
    AWS_DEFAULT_REGION: 'dXMtZWFzdC0x',
    AWS_S3_BUCKET: s3Bucket,
    AWS_S3_ENDPOINT: 'aHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tLw==',
    AWS_SECRET_ACCESS_KEY: 'c2RzZA==',
  },
  type: 'Opaque',
});
