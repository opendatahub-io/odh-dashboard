import { K8sResourceCommon, K8sResourceListResult } from '@openshift/dynamic-plugin-sdk-utils';

export const mockK8sResourceList = <TResource extends K8sResourceCommon>(
  resources: TResource[],
  options?: {
    namespace?: string;
  },
): K8sResourceListResult<TResource> => ({
  apiVersion: resources.length > 0 ? resources[0].apiVersion : 'v1',
  metadata: {
    continue: '',
    resourceVersion: '1462210',
  },
  items: options?.namespace
    ? resources.map((r) => ({ ...r, metadata: { ...r.metadata, namespace: options.namespace } }))
    : resources,
});
