import { K8sResourceBaseOptions, QueryParams } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions } from '~/k8sTypes';

const mergeK8sQueryParams = (
  opts: K8sAPIOptions = {},
  specificOpts: QueryParams = {},
): QueryParams => ({
  ...specificOpts,
  ...(opts.dryRun && { dryRun: 'All' }),
});

const mergeRequestInit = (
  opts: K8sAPIOptions = {},
  specificOpts: RequestInit = {},
): RequestInit => ({
  ...specificOpts,
  ...(opts.signal && { signal: opts.signal }),
});

export const applyK8sAPIOptions = <T extends K8sResourceBaseOptions>(
  opts: K8sAPIOptions = {},
  apiData: T,
): T => ({
  ...apiData,
  queryOptions: {
    ...apiData.queryOptions,
    queryParams: mergeK8sQueryParams(opts, apiData.queryOptions?.queryParams),
  },
  fetchOptions: {
    ...apiData.fetchOptions,
    requestInit: mergeRequestInit(opts, apiData.fetchOptions?.requestInit),
  },
});
