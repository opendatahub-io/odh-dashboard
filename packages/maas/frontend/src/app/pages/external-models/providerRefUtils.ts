import { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { ProviderRef } from '~/app/types/external-models';

export const getProviderRefResource = (providerRef: ProviderRef): K8sResourceCommon => ({
  apiVersion: 'maas.opendatahub.io/v1alpha1',
  kind: 'MaaSExternalProvider',
  metadata: {
    name: providerRef.providerName,
  },
});
