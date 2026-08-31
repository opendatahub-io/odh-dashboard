import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/k8s-core';
import { ServiceAccountModel } from '#~/api/models';
import { K8sAPIOptions, ServiceAccountKind } from '#~/k8sTypes';

export const assembleServiceAccount = (name: string, namespace: string): ServiceAccountKind => {
  const serviceAccount: ServiceAccountKind = {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name,
      namespace,
    },
  };
  return serviceAccount;
};

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

export const deleteServiceAccount = (
  name: string,
  ns: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<ServiceAccountKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: ServiceAccountModel,
        queryOptions: { name, ns },
      },
      opts,
    ),
  );
