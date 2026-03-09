import { k8sGetResource, k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { ClusterQueueKind } from '#~/k8sTypes';
import { ClusterQueueModel } from '#~/api/models/kueue';

export const getClusterQueue = (name: string): Promise<ClusterQueueKind> =>
  k8sGetResource<ClusterQueueKind>({
    model: ClusterQueueModel,
    queryOptions: { name },
  });

export const listClusterQueues = async (labelSelector?: string): Promise<ClusterQueueKind[]> => {
  const queryOptions = {
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<ClusterQueueKind>({
    model: ClusterQueueModel,
    queryOptions,
  });
};
