import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { ProjectModel, SelfSubjectAccessReviewModel } from '#~/api/models';
import { SelfSubjectAccessReviewKind } from '#~/k8sTypes';

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
  const selfSubjectAccessReview: SelfSubjectAccessReviewKind = {
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectAccessReview',
    spec: {
      resourceAttributes: {
        group,
        resource,
        subresource,
        verb,
        name,
        namespace: reviewNamespace,
      },
    },
  };
  return k8sCreateResource<SelfSubjectAccessReviewKind>({
    model: SelfSubjectAccessReviewModel,
    resource: selfSubjectAccessReview,
  })
    .then((result) => result.status?.allowed ?? true)
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('SelfSubjectAccessReview failed', e);
      return true; // if it critically fails, don't block SSAR checks; let it fail/succeed on future calls
    });
};
