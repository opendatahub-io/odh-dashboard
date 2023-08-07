import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { AcceleratorKind } from '~/k8sTypes';
import { AcceleratorModel } from '~/api/models';

export const listAccelerators = async (): Promise<AcceleratorKind[]> =>
  k8sListResource<AcceleratorKind>({
    model: AcceleratorModel,
  }).then((listResource) => listResource.items);
