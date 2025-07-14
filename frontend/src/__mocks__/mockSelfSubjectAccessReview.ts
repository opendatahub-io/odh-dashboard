import { K8sVerb, SelfSubjectAccessReviewKind } from '#~/k8sTypes';

type MockResourceConfigType = {
  verb?: K8sVerb;
  group?: string;
  resource?: string;
  allowed?: boolean;
  namespace?: string;
};

export const mockSelfSubjectAccessReview = ({
  verb = 'list',
  group = 'serving.kserve.io',
  resource = 'servingruntimes',
  namespace = 'opendatahub',
  allowed = false,
}: MockResourceConfigType): SelfSubjectAccessReviewKind => ({
  kind: 'SelfSubjectAccessReview',
  apiVersion: 'authorization.k8s.io/v1',
  spec: {
    resourceAttributes: {
      group,
      resource,
      verb,
      namespace,
    },
  },
  status: {
    allowed,
  },
});
