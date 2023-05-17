import { k8sCreateResource, k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ServiceAccountModel } from '~/api/models';
import { K8sAPIOptions, K8sStatus, ServiceAccountKind } from '~/k8sTypes';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';

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

export const createServiceAccount = async (
  data: ServiceAccountKind,
  opts?: K8sAPIOptions,
): Promise<ServiceAccountKind> =>
  k8sCreateResource<ServiceAccountKind>(
    applyK8sAPIOptions(opts, {
      model: ServiceAccountModel,
      resource: data,
    }),
  );

export const deleteServiceAccount = async (
  name: string,
  ns: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<ServiceAccountKind, K8sStatus>(
    applyK8sAPIOptions(opts, {
      model: ServiceAccountModel,
      queryOptions: { name, ns },
    }),
  );
