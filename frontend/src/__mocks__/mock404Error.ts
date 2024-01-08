import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';

export const mock404Error = ({ message = '404 Not Found' }: Partial<K8sStatus>): K8sStatus => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Failure',
  message,
  reason: 'NotFound',
  code: 404,
});
