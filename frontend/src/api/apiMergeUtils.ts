import { QueryParams } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions } from '~/k8sTypes';

export const mergeK8sQueryParams = (
  opts: K8sAPIOptions = {},
  specificOpts: QueryParams = {},
): QueryParams => ({
  ...specificOpts,
  ...(opts.dryRun && { dryRun: 'All' }),
});

export const mergeRequestInit = (
  opts: K8sAPIOptions = {},
  specificOpts: RequestInit = {},
): RequestInit => ({
  ...specificOpts,
  ...(opts.signal && { signal: opts.signal }),
});
