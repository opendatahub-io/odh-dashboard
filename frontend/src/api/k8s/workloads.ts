import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { WorkloadKind } from '#~/k8sTypes';
import { WorkloadModel } from '#~/api/models/kueue';

export const listWorkloads = async (
  namespace?: string,
  labelSelector?: string,
): Promise<WorkloadKind[]> => {
  const queryOptions = {
    ns: namespace,
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<WorkloadKind>({
    model: WorkloadModel,
    queryOptions,
  });
};
