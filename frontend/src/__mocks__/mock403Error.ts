import { K8sStatus } from '~/k8sTypes';

export const mock403Error = ({ message = '403 Forbidden' }: Partial<K8sStatus>): K8sStatus => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Failure',
  message,
  reason: 'Forbidden',
  code: 403,
});
