import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { LocalQueueModel } from './models';
import type { LocalQueueKind } from '../k8sTypes';

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
