import {
  k8sGetResource,
  k8sListResource,
  k8sDeleteResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { AcceleratorProfileKind, K8sAPIOptions } from '~/k8sTypes';
import { AcceleratorProfileModel } from '~/api/models';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';

export const listAcceleratorProfiles = async (
  namespace: string,
): Promise<AcceleratorProfileKind[]> =>
  k8sListResource<AcceleratorProfileKind>({
    model: AcceleratorProfileModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

export const getAcceleratorProfile = (
  name: string,
  namespace: string,
): Promise<AcceleratorProfileKind> =>
  k8sGetResource<AcceleratorProfileKind>({
    model: AcceleratorProfileModel,
    queryOptions: { name, ns: namespace },
  });

export const deleteAcceleratorProfile = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<AcceleratorProfileKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: AcceleratorProfileModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
