import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { HardwareProfileKind } from '~/k8sTypes';
import { HardwareProfileModel } from '~/api/models';

export const listHardwareProfiles = async (namespace: string): Promise<HardwareProfileKind[]> =>
  k8sListResource<HardwareProfileKind>({
    model: HardwareProfileModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

export const getHardwareProfile = (name: string, namespace: string): Promise<HardwareProfileKind> =>
  k8sGetResource<HardwareProfileKind>({
    model: HardwareProfileModel,
    queryOptions: { name, ns: namespace },
  });
