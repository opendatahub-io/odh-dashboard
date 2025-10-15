import { KnownLabels, SecretKind } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';

type MockCustomSecretData = {
  name: string;
  namespace: string;
  uid?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  data: Record<string, string>;
  type?: string;
};

export const mockCustomSecretK8sResource = ({
  name,
  namespace,
  uid = 'some-test-uid',
  labels = {},
  annotations = {},
  data,
  type = 'Opaque',
}: MockCustomSecretData): SecretKind => ({
  kind: 'Secret',
  apiVersion: 'route.openshift.io/v1',
  metadata: {
    name,
    namespace,
    uid,
    resourceVersion: '5985371',
    creationTimestamp: '2023-03-22T16:18:56Z',
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
      ...labels,
    },
    annotations,
  },
  data,
  type,
});

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  connectionType?: string;
  data?: Record<string, string>;
  s3Bucket?: string;
  endPoint?: string;
  region?: string;
  uid?: string;
  uri?: string;
};

export const mockSecretK8sResource = ({
  name = 'test-secret',
  namespace = 'test-project',
  displayName = 'Test Secret',
  connectionType = 's3',
  data,
  s3Bucket = 'dGVzdC1idWNrZXQ=',
  endPoint = 'aHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tLw==',
  region = 'dXMtZWFzdC0x',
  uid = genUID('secret'),
}: MockResourceConfigType): SecretKind =>
  mockCustomSecretK8sResource({
    name,
    namespace,
    uid,
    labels: {
      [KnownLabels.DATA_CONNECTION_AWS]: 'true',
    },
    annotations: {
      'opendatahub.io/connection-type': connectionType,
      'openshift.io/display-name': displayName,
    },
    data: data || {
      AWS_ACCESS_KEY_ID: 'c2RzZA==',
      AWS_DEFAULT_REGION: region,
      AWS_S3_BUCKET: s3Bucket,
      AWS_S3_ENDPOINT: endPoint,
      AWS_SECRET_ACCESS_KEY: 'c2RzZA==',
    },
  });

export const mockURISecretK8sResource = ({
  name = 'test-uri-secret',
  namespace = 'test-project',
  displayName = 'Test URI Secret',
  uri = 'https://test',
}: MockResourceConfigType): SecretKind =>
  mockCustomSecretK8sResource({
    name,
    namespace,
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
      'opendatahub.io/connection-type': 'true',
    },
    annotations: {
      'opendatahub.io/connection-type': 'uri-v1',
      'openshift.io/display-name': displayName,
    },
    data: { URI: window.btoa(uri) },
  });
