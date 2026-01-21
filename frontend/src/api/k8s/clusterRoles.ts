import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { ClusterRoleKind } from '#~/k8sTypes';
import { ClusterRoleModel } from '#~/api/models';

export const listClusterRoles = (labelSelector?: string): Promise<ClusterRoleKind[]> => {
  const queryOptions = {
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<ClusterRoleKind>({
    model: ClusterRoleModel,
    queryOptions,
  });
};
