import { checkAccess as checkResourceAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { ProjectModel } from '#~/api/models';

export const checkAccess = ({
  group,
  resource,
  subresource,
  verb,
  name,
  namespace,
}: Required<AccessReviewResourceAttributes>): Promise<boolean> => {
  // Projects are a special case. `namespace` must be set to the project name
  // even though it's a cluster-scoped resource.
  const reviewNamespace =
    group === ProjectModel.apiGroup && resource === ProjectModel.plural ? name : namespace;
  return checkResourceAccess(
    { group, resource, subresource, verb, name, namespace: reviewNamespace },
    {
      onError: (error) => {
        // eslint-disable-next-line no-console
        console.warn('SelfSubjectAccessReview failed', error);
      },
    },
  );
};
