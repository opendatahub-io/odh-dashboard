import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { SelfSubjectAccessReviewModel } from './models';
import { applyK8sAPIOptions } from '../apiMergeUtils';
import type { AccessReviewResourceAttributes, K8sAPIOptions, K8sResourceCommon } from '../k8sTypes';

type SelfSubjectAccessReview = K8sResourceCommon & {
  spec: { resourceAttributes: AccessReviewResourceAttributes };
  status?: { allowed?: boolean };
};

export type CheckAccessOptions = K8sAPIOptions & {
  defaultAllowed?: boolean;
  onError?: (error: unknown) => void;
};

export const checkAccess = async (
  resourceAttributes: AccessReviewResourceAttributes,
  { defaultAllowed = true, onError, ...apiOptions }: CheckAccessOptions = {},
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
    return response.status?.allowed ?? defaultAllowed;
  } catch (error) {
    onError?.(error);
    return defaultAllowed;
  }
};
