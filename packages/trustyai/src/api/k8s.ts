import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  K8sResourceBaseOptions,
  K8sResourceDeleteOptions,
  K8sStatus,
  QueryParams,
} from '@openshift/dynamic-plugin-sdk-utils';
import { kindApiVersion } from '@odh-dashboard/k8s-core';
import type { K8sAPIOptions, TrustyAIKind } from '@odh-dashboard/k8s-core';
import { TrustyAIApplicationsModel } from './model';
import { TRUSTYAI_DEFINITION_NAME } from '../const';

const dryRunPayload = (dryRun?: boolean): Pick<K8sResourceDeleteOptions, 'payload'> =>
  dryRun ? { payload: { dryRun: ['All'] } } : {};

const mergeK8sQueryParams = (opts: K8sAPIOptions, specificOpts: QueryParams = {}): QueryParams => ({
  ...specificOpts,
  ...(opts.dryRun && { dryRun: 'All' }),
});

const applyK8sAPIOptions = <T extends K8sResourceBaseOptions>(
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
    requestInit: {
      ...apiData.fetchOptions?.requestInit,
      ...(opts.signal && { signal: opts.signal }),
    },
  },
});

export const getTrustyAICR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<TrustyAIKind> =>
  k8sGetResource<TrustyAIKind>(
    applyK8sAPIOptions(
      {
        model: TrustyAIApplicationsModel,
        queryOptions: {
          ns: namespace,
          name: TRUSTYAI_DEFINITION_NAME,
        },
      },
      opts,
    ),
  );

export const createTrustyAICR = async (
  namespace: string,
  secretName: string,
  opts?: K8sAPIOptions,
): Promise<TrustyAIKind> => {
  const resource: TrustyAIKind = {
    apiVersion: kindApiVersion(TrustyAIApplicationsModel),
    kind: TrustyAIApplicationsModel.kind,
    metadata: {
      name: TRUSTYAI_DEFINITION_NAME,
      namespace,
    },
    spec: {
      storage: {
        format: 'DATABASE',
        databaseConfigurations: secretName,
      },
      metrics: {
        schedule: '5s',
      },
    },
  };

  return k8sCreateResource<TrustyAIKind>(
    applyK8sAPIOptions(
      {
        model: TrustyAIApplicationsModel,
        resource,
      },
      opts,
    ),
  );
};

export const deleteTrustyAICR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<TrustyAIKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: TrustyAIApplicationsModel,
        queryOptions: {
          name: TRUSTYAI_DEFINITION_NAME,
          ns: namespace,
        },
      },
      opts,
    ),
  );
