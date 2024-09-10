import { DashboardLabels, DisplayNameAnnotations, SecretKind } from '~/k8sTypes';

export type Connection = SecretKind & {
  metadata: {
    labels: DashboardLabels & {
      'opendatahub.io/managed': 'true';
    };
    annotations: DisplayNameAnnotations & {
      'opendatahub.io/connection-type': string;
    };
  };
  data: {
    [key: string]: string;
  };
};

export const isConnection = (secret: SecretKind): secret is Connection =>
  !!secret.metadata.annotations &&
  'opendatahub.io/connection-type' in secret.metadata.annotations &&
  !!secret.metadata.labels &&
  secret.metadata.labels['opendatahub.io/managed'] === 'true';
