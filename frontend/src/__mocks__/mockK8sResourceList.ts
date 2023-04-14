import { K8sResourceCommon, K8sResourceListResult } from '@openshift/dynamic-plugin-sdk-utils';

export const mockK8sResourceList = <TResource extends K8sResourceCommon>(
  resources: TResource[],
): K8sResourceListResult<TResource> => ({
  apiVersion: 'serving.kserve.io/v1alpha1',
  metadata: {
    continue: '',
    resourceVersion: '1462210',
  },
  items: resources,
});
