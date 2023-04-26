import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { UserKind } from '~/k8sTypes';
import { UserModel } from '~/api/models';

export const listUsers = (labelSelector?: string): Promise<UserKind[]> => {
  const queryOptions = {
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResource<UserKind>({
    model: UserModel,
    queryOptions,
  }).then((listResource) => listResource.items);
};
