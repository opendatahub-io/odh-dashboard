import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';

export const mock404Error = ({ message = '404 Not Found' }: Partial<K8sStatus>): K8sStatus => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Failure',
  message,
  reason: 'NotFound',
  code: 404,
});

export const mock403Error = ({ message = '403 Forbidden' }: Partial<K8sStatus>): K8sStatus => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Failure',
  message,
  reason: 'Forbidden',
  code: 403,
});

export const mock403ErrorWithDetails = ({
  message = '403 Forbidden',
}: Partial<K8sStatus>): K8sStatus & { details?: { kind?: string } } => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Failure',
  message,
  reason: 'Forbidden',
  code: 403,
  details: {
    kind: 'notebooks',
  },
});

export const mock409Error = ({ message = '409 Conflict' }: Partial<K8sStatus>): K8sStatus => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Failure',
  message,
  reason: 'AlreadyExists',
  code: 409,
});

export const mock200Status = ({ message = '200 OK' }: Partial<K8sStatus>): K8sStatus => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Success',
  message,
  reason: 'OK',
  code: 200,
});
