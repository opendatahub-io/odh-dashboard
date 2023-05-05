import { k8sCreateResource, k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ServiceAccountModel } from '~/api/models';
import { K8sStatus, ServiceAccountKind } from '~/k8sTypes';

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

export const createServiceAccount = async (data: ServiceAccountKind): Promise<ServiceAccountKind> =>
  k8sCreateResource<ServiceAccountKind>({
    model: ServiceAccountModel,
    resource: data,
  });

export const deleteServiceAccount = async (name: string, ns: string): Promise<K8sStatus> =>
  k8sDeleteResource<ServiceAccountKind, K8sStatus>({
    model: ServiceAccountModel,
    queryOptions: { name, ns },
  });
