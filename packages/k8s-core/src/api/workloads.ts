import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { WorkloadModel } from './models';
import type { WorkloadKind } from '../k8sTypes';

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
