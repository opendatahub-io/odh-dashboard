import { K8sStatus } from '~/k8sTypes';

export const mock404Error = ({ message = '404 Not Found' }: Partial<K8sStatus>): K8sStatus => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Error',
  message,
  reason: 'Note Found',
  code: 404,
});
