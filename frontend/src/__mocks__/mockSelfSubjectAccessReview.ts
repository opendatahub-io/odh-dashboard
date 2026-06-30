import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { SelfSubjectAccessReviewKind } from '#~/k8sTypes';

type MockResourceConfigType = Partial<AccessReviewResourceAttributes> & {
  allowed?: boolean;
};

export const mockSelfSubjectAccessReview = ({
  verb = 'list',
  group = 'serving.kserve.io',
  resource = 'servingruntimes',
  subresource,
  name,
  namespace = 'opendatahub',
  allowed = false,
}: MockResourceConfigType): SelfSubjectAccessReviewKind => ({
  kind: 'SelfSubjectAccessReview',
  apiVersion: 'authorization.k8s.io/v1',
  spec: {
    resourceAttributes: {
      group,
      resource,
      subresource,
      verb,
      name,
      namespace,
    },
  },
  status: {
    allowed,
  },
});
