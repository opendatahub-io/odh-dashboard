import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { AcceleratorKind } from '~/k8sTypes';
import { AcceleratorModel } from '~/api/models';

export const listAccelerators = async (namespace: string): Promise<AcceleratorKind[]> =>
  k8sListResource<AcceleratorKind>({
    model: AcceleratorModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);
