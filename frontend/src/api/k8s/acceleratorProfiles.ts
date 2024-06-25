import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { AcceleratorProfileKind } from '~/k8sTypes';
import { AcceleratorProfileModel } from '~/api/models';
import { TolerationEffect, TolerationOperator } from '~/types';

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

export const fakeAcceleratorProfile: AcceleratorProfileKind = {
  apiVersion: 'dashboard.opendatahub.io/v1',
  kind: 'AcceleratorProfile',
  metadata: {
    name: 'migrated-gpu',
  },
  spec: {
    identifier: 'nvidia.com/gpu',
    displayName: 'NVIDIA GPU',
    enabled: true,
    tolerations: [
      {
        key: 'nvidia.com/gpu',
        operator: TolerationOperator.EXISTS,
        effect: TolerationEffect.NO_SCHEDULE,
      },
    ],
  },
};
