import {
  k8sCreateResource,
  type K8sModelCommon,
  type K8sResourceCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import type { AccessReviewResourceAttributes, K8sAPIOptions, K8sVerb } from '../k8sTypes';

/** Omit namespace for cluster-scoped reviews; never substitute the application namespace. */
export const verbModelAccess = (
  verb: K8sVerb,
  model: K8sModelCommon,
  namespace?: string,
): AccessReviewResourceAttributes => ({
  group: model.apiGroup ?? '',
  resource: model.plural,
  verb,
  ...(namespace === undefined ? {} : { namespace }),
});

type SelfSubjectAccessReview = K8sResourceCommon & {
  spec: { resourceAttributes: AccessReviewResourceAttributes };
  status?: { allowed?: boolean; denied?: boolean; evaluationError?: string };
};

/** Caller-scoped SSAR. Denial resolves false; transport/evaluation failures reject. */
export const checkAccessStrict = async (
  resourceAttributes: AccessReviewResourceAttributes,
  opts?: Pick<K8sAPIOptions, 'signal'>,
): Promise<boolean> => {
  const result = await k8sCreateResource<SelfSubjectAccessReview>({
    model: {
      apiGroup: 'authorization.k8s.io',
      apiVersion: 'v1',
      kind: 'SelfSubjectAccessReview',
      plural: 'selfsubjectaccessreviews',
    },
    resource: {
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectAccessReview',
      spec: { resourceAttributes },
    },
    fetchOptions: { requestInit: { signal: opts?.signal } },
  });
  if (result.status?.evaluationError || typeof result.status?.allowed !== 'boolean') {
    throw new Error(result.status?.evaluationError || 'Invalid access review response.');
  }
  return result.status.allowed === true && result.status.denied !== true;
};
