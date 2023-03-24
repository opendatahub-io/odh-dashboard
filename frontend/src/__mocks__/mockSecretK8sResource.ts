import { SecretKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
};

export const mockSecretK8sResource = ({
  name = 'test-secret',
  namespace = 'test-project',
  displayName = 'Test Secret',
}: MockResourceConfigType): SecretKind => ({
  kind: 'Secret',
  apiVersion: 'route.openshift.io/v1',
  metadata: {
    name: name,
    namespace: namespace,
    uid: '207d7ac9-c67e-4a0d-b36b-148b7a09ef1e',
    resourceVersion: '5985371',
    creationTimestamp: '2023-03-22T16:18:56Z',
    labels: {
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/managed': 'true',
    },
    annotations: {
      'opendatahub.io/connection-type': 's3',
      'openshift.io/display-name': displayName,
    },
  },
  data: {
    AWS_ACCESS_KEY_ID: 'c2RzZA==',
    AWS_DEFAULT_REGION: 'dXMtZWFzdC0x',
    AWS_S3_BUCKET: '',
    AWS_S3_ENDPOINT: 'aHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tLw==',
    AWS_SECRET_ACCESS_KEY: 'c2RzZA==',
  },
  type: 'Opaque',
});
