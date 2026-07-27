import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { ResourceFlavorKind } from '#~/k8sTypes';
import { ResourceFlavorModel } from '#~/api/models/kueue';

export const listResourceFlavors = async (
  labelSelector?: string,
): Promise<ResourceFlavorKind[]> => {
  const queryOptions = {
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<ResourceFlavorKind>({
    model: ResourceFlavorModel,
    queryOptions,
  });
};
