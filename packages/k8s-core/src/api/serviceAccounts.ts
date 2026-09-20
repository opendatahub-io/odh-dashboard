import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ServiceAccountModel } from './models';
import { applyK8sAPIOptions } from '../index';
import type { K8sAPIOptions, ServiceAccountKind } from '../k8sTypes';

export const assembleServiceAccount = (name: string, namespace: string): ServiceAccountKind => ({
  apiVersion: 'v1',
  kind: 'ServiceAccount',
  metadata: {
    name,
    namespace,
  },
});

export const getServiceAccount = (name: string, namespace: string): Promise<ServiceAccountKind> =>
  k8sGetResource<ServiceAccountKind>({
    model: ServiceAccountModel,
    queryOptions: { name, ns: namespace },
  });

export const createServiceAccount = (
  data: ServiceAccountKind,
  opts?: K8sAPIOptions,
): Promise<ServiceAccountKind> =>
  k8sCreateResource<ServiceAccountKind>(
    applyK8sAPIOptions(
      {
        model: ServiceAccountModel,
        resource: data,
      },
      opts,
    ),
  );
