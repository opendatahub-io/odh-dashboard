import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { AcceleratorProfileKind } from '~/k8sTypes';
import { AcceleratorProfileModel } from '~/api/models';

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
