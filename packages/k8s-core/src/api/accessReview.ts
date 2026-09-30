import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { SelfSubjectAccessReviewModel } from './models';
import { applyK8sAPIOptions } from '../apiMergeUtils';
import type { AccessReviewResourceAttributes, K8sAPIOptions, K8sResourceCommon } from '../k8sTypes';

type SelfSubjectAccessReview = K8sResourceCommon & {
  spec: { resourceAttributes: AccessReviewResourceAttributes };
  status?: { allowed?: boolean };
};

export type CheckAccessOptions = K8sAPIOptions;

export const checkAccess = async (
  resourceAttributes: AccessReviewResourceAttributes,
  apiOptions: CheckAccessOptions = {},
): Promise<boolean> => {
  const review: SelfSubjectAccessReview = {
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectAccessReview',
    spec: { resourceAttributes },
  };

  try {
    const response = await k8sCreateResource<SelfSubjectAccessReview>(
      applyK8sAPIOptions({ model: SelfSubjectAccessReviewModel, resource: review }, apiOptions),
    );
    return response.status?.allowed ?? false;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('SelfSubjectAccessReview failed', error);
    throw error;
  }
};
