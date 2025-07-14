import {
  K8sResourceBaseOptions,
  K8sResourceDeleteOptions,
  QueryParams,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions } from '#~/k8sTypes';

const dryRunPayload = (dryRun?: boolean): Pick<K8sResourceDeleteOptions, 'payload'> =>
  dryRun ? { payload: { dryRun: ['All'] } } : {};

const mergeK8sQueryParams = (opts: K8sAPIOptions, specificOpts: QueryParams = {}): QueryParams => ({
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

export const applyK8sAPIOptions = <T extends K8sResourceBaseOptions>(
  apiData: T,
  opts: K8sAPIOptions = {},
): T => ({
  ...dryRunPayload(opts.dryRun),
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
