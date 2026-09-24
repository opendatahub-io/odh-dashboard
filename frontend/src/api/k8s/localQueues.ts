import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { LocalQueueModel } from '@odh-dashboard/k8s-core/api/models';
import { LocalQueueKind } from '#~/k8sTypes';

export const listLocalQueues = async (
  namespace?: string,
  labelSelector?: string,
): Promise<LocalQueueKind[]> => {
  const queryOptions = {
    ns: namespace,
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<LocalQueueKind>({
    model: LocalQueueModel,
    queryOptions,
  });
};

export const listAllLocalQueues = async (labelSelector?: string): Promise<LocalQueueKind[]> => {
  const queryOptions = {
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<LocalQueueKind>({
    model: LocalQueueModel,
    queryOptions,
  });
};
