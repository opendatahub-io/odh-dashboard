import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { GroupKind } from '~/k8sTypes';
import { GroupModel } from '~/api/models';

export const listGroups = (labelSelector?: string): Promise<GroupKind[]> => {
  const queryOptions = {
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResource<GroupKind>({
    model: GroupModel,
    queryOptions,
  }).then((listResource) => listResource.items);
};
