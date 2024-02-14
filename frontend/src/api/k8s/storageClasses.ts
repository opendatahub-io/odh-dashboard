import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { StorageClassKind } from '~/k8sTypes';
import { StorageClassModel } from '~/api/models';

export const getStorageClasses = (): Promise<StorageClassKind[]> =>
  k8sListResource<StorageClassKind>({
    model: StorageClassModel,
    queryOptions: {},
  }).then((listResource) => listResource.items);
