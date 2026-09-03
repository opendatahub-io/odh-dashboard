import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/k8s-core';
import { ServiceAccountModel } from '@odh-dashboard/k8s-core/api/models';
import { K8sAPIOptions, ServiceAccountKind } from '#~/k8sTypes';

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
