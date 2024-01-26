import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';

export const mock409Error = ({ message = '409 Conflict' }: Partial<K8sStatus>): K8sStatus => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Failure',
  message,
  reason: 'AlreadyExists',
  code: 409,
});
