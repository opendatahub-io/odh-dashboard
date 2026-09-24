import { applyOverrides } from '@openshift/dynamic-plugin-sdk';
import {
  commonFetchJSON,
  getK8sResourceURL,
  K8sResourceCommon,
  K8sResourceUpdateOptions,
} from '@openshift/dynamic-plugin-sdk-utils';

export {
  createNonDestructivePatches,
  createPatchesFromDiff,
  groupVersionKind,
} from '@odh-dashboard/k8s-core/api/k8sUtils';

export const k8sMergePatchResource = <
  TResource extends K8sResourceCommon,
  TUpdatedResource extends TResource = TResource,
>({
  model,
  resource,
  queryOptions = {},
  fetchOptions = {},
}: K8sResourceUpdateOptions<TResource>): Promise<TUpdatedResource> => {
  if (!resource.metadata?.name) {
    return Promise.reject(new Error('Resource payload name not specified'));
  }

  return commonFetchJSON<TUpdatedResource>(
    getK8sResourceURL(model, resource, queryOptions),
    applyOverrides(fetchOptions.requestInit, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify(resource),
    }),
    fetchOptions.timeout,
    true,
  );
};
