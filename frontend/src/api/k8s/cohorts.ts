import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { CohortKind } from '#~/k8sTypes';
import { CohortModel } from '#~/api/models/kueue';

export const listCohorts = async (labelSelector?: string): Promise<CohortKind[]> => {
  const queryOptions = {
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<CohortKind>({
    model: CohortModel,
    queryOptions,
  });
};
