import {
  k8sCreateResource,
  k8sGetResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
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

export const getServiceAccount = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServiceAccountKind> =>
  k8sGetResource<ServiceAccountKind>(
    applyK8sAPIOptions(
      {
        model: ServiceAccountModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

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

export const replaceServiceAccount = (
  data: ServiceAccountKind,
  opts?: K8sAPIOptions,
): Promise<ServiceAccountKind> =>
  k8sUpdateResource<ServiceAccountKind>(
    applyK8sAPIOptions(
      {
        model: ServiceAccountModel,
        resource: data,
      },
      opts,
    ),
  );
